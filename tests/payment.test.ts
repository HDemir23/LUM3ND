import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { validateChainPayment } from "../lib/stellar";
const sender = Keypair.random(),
  receiver = Keypair.random(),
  issuer = Keypair.random();
const tx = new TransactionBuilder(new Account(sender.publicKey(), "10"), {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .addMemo(Memo.text("order-123"))
  .addOperation(
    Operation.payment({
      destination: receiver.publicKey(),
      asset: new Asset("USDC", issuer.publicKey()),
      amount: "12.3456789",
    }),
  )
  .setTimeout(900)
  .build();
tx.sign(sender);
const record = {
  successful: true,
  envelope_xdr: tx.toXDR(),
  hash: Buffer.from(tx.hash()).toString("hex"),
  created_at: "2026-09-19T10:00:00Z",
};
const expected = {
  hash: record.hash,
  source: sender.publicKey(),
  destination: receiver.publicKey(),
  issuer: issuer.publicKey(),
  amount: "12.3456789",
  memo: "order-123",
  passphrase: Networks.TESTNET,
  latest: Date.parse("2026-09-19T10:15:00Z") / 1000,
};
test("exact chain payment accepted", () =>
  assert.doesNotThrow(() => validateChainPayment(record, expected)));
for (const [key, value] of Object.entries({
  source: receiver.publicKey(),
  destination: sender.publicKey(),
  issuer: receiver.publicKey(),
  amount: "12.3456788",
  memo: "other-order",
  passphrase: Networks.PUBLIC,
  hash: "0".repeat(64),
  latest: 0,
  earliest: Date.parse("2026-09-20") / 1000,
}))
  test(`rejects mismatched ${key}`, () =>
    assert.throws(() =>
      validateChainPayment(record, { ...expected, [key]: value }),
    ));
test("rejects failed or malformed ledger results", () => {
  assert.throws(() =>
    validateChainPayment({ ...record, successful: false }, expected),
  );
  assert.throws(() =>
    validateChainPayment({ ...record, created_at: "invalid" }, expected),
  );
});
test("rejects extra operations and operation-level sender override", () => {
  for (const extra of [true, false]) {
    const builder = new TransactionBuilder(
      new Account(sender.publicKey(), "11"),
      { fee: "100", networkPassphrase: Networks.TESTNET },
    ).addMemo(Memo.text("order-123"));
    builder.addOperation(
      Operation.payment({
        source: extra ? undefined : receiver.publicKey(),
        destination: receiver.publicKey(),
        asset: new Asset("USDC", issuer.publicKey()),
        amount: "12.3456789",
      }),
    );
    if (extra)
      builder.addOperation(
        Operation.payment({
          destination: receiver.publicKey(),
          asset: Asset.native(),
          amount: "1",
        }),
      );
    const altered = builder.setTimeout(900).build();
    const hash = Buffer.from(altered.hash()).toString("hex");
    assert.throws(() =>
      validateChainPayment(
        { ...record, hash, envelope_xdr: altered.toXDR() },
        { ...expected, hash },
      ),
    );
  }
});

test("rejects a different asset code even with the same issuer and amount", () => {
  const other = new TransactionBuilder(new Account(sender.publicKey(), "30"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addMemo(Memo.text("order-123"))
    .addOperation(
      Operation.payment({
        destination: receiver.publicKey(),
        asset: new Asset("USD", issuer.publicKey()),
        amount: expected.amount,
      }),
    )
    .setTimeout(900)
    .build();
  const hash = Buffer.from(other.hash()).toString("hex");
  assert.throws(() =>
    validateChainPayment(
      { ...record, hash, envelope_xdr: other.toXDR() },
      { ...expected, hash },
    ),
  );
});
