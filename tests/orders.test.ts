import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  Account,
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

test("database payment lifecycle, timeout recovery, replay prevention, refunds and expiry", async (t) => {
  const temp = mkdtempSync(join(tmpdir(), "linka-test-"));
  process.env.DATABASE_URL = `file:${join(temp, "test.db")}`;
  process.env.STELLAR_NETWORK = "testnet";
  const payer = Keypair.random(),
    receiver = Keypair.random(),
    issuer = Keypair.random();
  process.env.TESTNET_RECEIVER = receiver.publicKey();
  process.env.TESTNET_USDC_ISSUER = issuer.publicKey();
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
    { env: process.env, stdio: "pipe" },
  );
  const { db } = await import("../lib/db");
  const service = await import("../lib/orders");
  const ledgerRecords = new Map<string, object>();
  let trust = true,
    balance = "1000",
    native = "100";
  let simulateLag = false;
  let lookupCount = 0;
  mock.method(
    Horizon.Server.prototype,
    "loadAccount",
    async (address: string) =>
      Object.assign(new Account(address, "100"), {
        subentry_count: 1,
        num_sponsoring: 0,
        num_sponsored: 0,
        balances: [
          { asset_type: "native", balance: native, selling_liabilities: "0" },
          ...(trust
            ? [
                {
                  asset_type: "credit_alphanum4",
                  asset_code: "USDC",
                  asset_issuer: issuer.publicKey(),
                  balance,
                  limit: "9999999",
                  buying_liabilities: "0",
                  selling_liabilities: "0",
                  is_authorized: true,
                },
              ]
            : []),
        ],
      }),
  );
  mock.method(Horizon.Server.prototype, "transactions", () => ({
    transaction: (hash: string) => ({
      call: async () => {
        lookupCount++;
        if (simulateLag) {
          simulateLag = false;
          throw { response: { status: 404 } };
        }
        const record = ledgerRecords.get(hash);
        if (!record) throw { response: { status: 404 } };
        return record;
      },
    }),
  }));
  mock.method(Horizon.Server.prototype, "ledgers", () => ({
    order: () => ({
      limit: () => ({
        call: async () => ({
          records: [{ closed_at: new Date().toISOString() }],
        }),
      }),
    }),
  }));
  mock.method(Horizon.Server.prototype, "submitTransaction", async () => {
    throw new Error("simulated timeout");
  });
  const input = {
    url: "https://www.trendyol.com/marka/urun-p-123456",
    quantity: 2,
    notes: "Siyah",
  };
  const quote = {
    title: "Test ürünü",
    productTry: "1000",
    shippingTry: "100",
    rate: "40",
  };
  const newQuoted = async () => {
    const o = await service.createOrder(input);
    return service.quoteOrder(o.id, quote);
  };
  try {
    await t.test(
      "quote ignores browser price and enforces preflight",
      async () => {
        const o = await service.createOrder({ ...input, totalUsdc: "0.01" });
        assert.equal(o.totalUsdc, null);
        await service.quoteOrder(o.id, quote);
        trust = false;
        await assert.rejects(
          () => service.preparePayment(o.id, payer.publicKey()),
          /trustline/,
        );
        trust = true;
        balance = "1";
        await assert.rejects(
          () => service.preparePayment(o.id, payer.publicKey()),
          /yeterli USDC/,
        );
        balance = "1000";
        native = "0.5";
        await assert.rejects(
          () => service.preparePayment(o.id, payer.publicKey()),
          /XLM/,
        );
        native = "100";
      },
    );
    await t.test(
      "immutable attempt survives rejected signature and timeout, then verifies once",
      async () => {
        const o = await newQuoted();
        const a = await service.preparePayment(o.id, payer.publicKey());
        assert.equal((await service.getOrder(o.id)).status, "QUOTED");
        assert.equal(
          (await service.preparePayment(o.id, payer.publicKey())).hash,
          a.hash,
        );
        await assert.rejects(() => service.quoteOrder(o.id, quote));
        await assert.rejects(() =>
          service.updateStatus(o.id, { status: "CANCELLED" }),
        );
        const tx = TransactionBuilder.fromXDR(
          a.xdr,
          Networks.TESTNET,
        ) as Transaction;
        tx.sign(payer);
        assert.equal(
          (await service.submitPayment(o.id, tx.toXDR())).state,
          "PENDING",
        );
        ledgerRecords.set(a.hash, {
          successful: true,
          hash: a.hash,
          envelope_xdr: tx.toXDR(),
          created_at: new Date().toISOString(),
        });
        assert.equal((await service.verifyPayment(o.id)).state, "PAID");
        assert.equal((await service.verifyPayment(o.id)).state, "PAID");
        assert.equal(await db.attempt.count({ where: { orderId: o.id } }), 1);
        const other = await newQuoted();
        await service.preparePayment(other.id, payer.publicKey());
        await assert.rejects(
          () => service.submitPayment(other.id, tx.toXDR()),
          /eşleşmiyor/,
        );
        await assert.rejects(() =>
          db.order.update({
            where: { id: other.id },
            data: { paidHash: a.hash },
          }),
        );
        await assert.rejects(() =>
          service.updateStatus(o.id, { status: "PURCHASED" }),
        );
        await service.updateStatus(o.id, {
          status: "PURCHASED",
          purchaseRef: "TY-TEST-123",
        });
        await service.updateStatus(o.id, {
          status: "SHIPPED",
          shippingInfo: "Test kargo 123",
        });
        await service.updateStatus(o.id, { status: "REFUND_PENDING" });
        await assert.rejects(() => service.verifyRefund(o.id, a.hash));
        const refund = new TransactionBuilder(
          new Account(receiver.publicKey(), "20"),
          { fee: "100", networkPassphrase: Networks.TESTNET },
        )
          .addMemo(Memo.text(`R${o.memo}`))
          .addOperation(
            Operation.payment({
              destination: payer.publicKey(),
              asset: new Asset("USDC", issuer.publicKey()),
              amount: o.totalUsdc!,
            }),
          )
          .setTimeout(900)
          .build();
        refund.sign(receiver);
        const hash = Buffer.from(refund.hash()).toString("hex");
        ledgerRecords.set(hash, {
          successful: true,
          hash,
          envelope_xdr: refund.toXDR(),
          created_at: new Date().toISOString(),
        });
        assert.equal(
          (await service.verifyRefund(o.id, hash)).status,
          "REFUNDED",
        );
      },
    );
    await t.test(
      "expired quotes cannot prepare and old attempts require ledger reconciliation",
      async () => {
        const o = await newQuoted();
        await db.order.update({
          where: { id: o.id },
          data: { expiresAt: new Date(0) },
        });
        await assert.rejects(
          () => service.preparePayment(o.id, payer.publicKey()),
          /süresi doldu/,
        );
        await service.quoteOrder(o.id, quote);
        const a = await service.preparePayment(o.id, payer.publicKey());
        await db.attempt.update({
          where: { hash: a.hash },
          data: { maxTime: Math.floor(Date.now() / 1000) - 120 },
        });
        lookupCount = 0;
        assert.equal((await service.verifyPayment(o.id)).state, "EXPIRED");
        assert.equal(lookupCount, 2);
        await service.quoteOrder(o.id, quote);
      },
    );
    await t.test(
      "ledger ingestion between not-found and watermark does not release payment lock",
      async () => {
        const o = await newQuoted();
        const a = await service.preparePayment(o.id, payer.publicKey());
        const oldTime = Math.floor(Date.now() / 1000) - 120;
        await db.attempt.update({
          where: { hash: a.hash },
          data: { maxTime: oldTime },
        });
        ledgerRecords.set(a.hash, {
          successful: true,
          hash: a.hash,
          envelope_xdr: a.xdr,
          created_at: new Date((oldTime - 10) * 1000).toISOString(),
        });
        simulateLag = true;
        assert.equal((await service.verifyPayment(o.id)).state, "PAID");
      },
    );
  } finally {
    mock.restoreAll();
    await db.$disconnect();
    rmSync(temp, { recursive: true, force: true });
  }
});
