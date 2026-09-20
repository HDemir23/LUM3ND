import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { Keypair } from "@stellar/stellar-sdk";
import { randomUUID } from "node:crypto";

test("wallet authentication, persistent basket, ownership, quote and fulfillment", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("https://www.amazon.com.tr/dp/")) return new Response(`<span id="productTitle">Amazon test ürünü</span><img id="landingImage" src="https://m.media-amazon.com/images/I/test.jpg"><div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">400,00 TL</span></span></div>`);
    if (url === "https://www.tcmb.gov.tr/kurlar/today.xml") {
      const date = new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
      return new Response(`<Tarih_Date Tarih="${date}"><Currency CurrencyCode="USD"><ForexSelling>40.0000</ForexSelling></Currency></Tarih_Date>`);
    }
    throw new Error(`Unexpected network request: ${url}`);
  });
  delete process.env.RAINFOREST_API_KEY;
  const temp = mkdtempSync(join(tmpdir(), "sp3nd-basket-"));
  process.env.DATABASE_URL = `file:${join(temp, "test.db")}`;
  process.env.APP_ORIGIN = "http://127.0.0.1:5173";
  process.env.STELLAR_NETWORK = "testnet";
  process.env.TESTNET_RECEIVER = Keypair.random().publicKey();
  process.env.TESTNET_USDC_ISSUER = Keypair.random().publicKey();
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
    { env: process.env, stdio: "pipe" },
  );
  const { db } = await import("../lib/db");
  const { challenge, consumeChallenge, messageHash } =
    await import("../lib/wallet-auth");
  const { addCart, getCart, changeCart, checkout } =
    await import("../lib/cart");
  const { getOrder, quoteOrder, preparePayment, fulfillStore, updateStatus } =
    await import("../lib/orders");
  const a = Keypair.random(),
    b = Keypair.random();
  const address = {
    name: "Test Alıcı",
    phone: "+905551234567",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Test Mahallesi, Test Sokak 1",
    postalCode: "34710",
  };
  try {
    // Published SEP-53 vector also guards against a self-consistent but incompatible signing implementation.
    const vector = Keypair.fromPublicKey(
      "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L",
    );
    assert.equal(
      vector.verify(
        messageHash("Hello, World!"),
        Buffer.from(
          "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==",
          "base64",
        ),
      ),
      true,
    );
    for (const key of [a, b]) {
      const c = await challenge(key.publicKey());
      const signature = Buffer.from(key.sign(messageHash(c.message))).toString(
        "base64",
      );
      await assert.rejects(
        () =>
          consumeChallenge(
            c.id,
            Buffer.from(Keypair.random().sign(messageHash(c.message))).toString(
              "base64",
            ),
          ),
        /doğrulanamadı/,
      );
      assert.equal(await consumeChallenge(c.id, signature), key.publicKey());
      await assert.rejects(
        () => consumeChallenge(c.id, signature),
        /kullanılmış/,
      );
    }
    const expired = await challenge(a.publicKey());
    await db.loginChallenge.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(0) },
    });
    await assert.rejects(
      () =>
        consumeChallenge(
          expired.id,
          Buffer.from(a.sign(messageHash(expired.message))).toString("base64"),
        ),
      /süresi/,
    );
    const race = await challenge(a.publicKey());
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        consumeChallenge(
          race.id,
          Buffer.from(a.sign(messageHash(race.message))).toString("base64"),
        ),
      ),
    );
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    // Manual fallback accepts only the URL/quantity; browser-supplied prices
    // cannot turn an unavailable Amazon product into a payable quote.
    const fallback = await addCart(a.publicKey(), {
      url: "https://www.amazon.com.tr/dp/B000000001",
      quantity: 1, manualQuote: true, title: "Untrusted", unitTry: "0.01", unitUsd: "0.01",
    });
    assert.equal(fallback[0].unitTry, null);
    assert.equal(fallback[0].unitUsd, null);
    assert.equal(fallback[0].title, null);
    await changeCart(a.publicKey(), fallback[0].id, { quantity: 0 });
    const urls = [
      "https://www.amazon.com.tr/dp/B012345678",
      "https://www.trendyol.com/urun-p-12345",
      "https://www.hepsiburada.com/urun-p-HBC000012345",
    ];
    for (const url of urls)
      await addCart(a.publicKey(), { url, quantity: 1, notes: "M" });
    await addCart(a.publicKey(), {
      url: urls[0] + "?tag=test",
      quantity: 2,
      notes: "M",
      title: "Forged title",
      unitUsd: "0.01",
      imageUrl: "https://example.com/forged.jpg",
    });
    assert.equal((await getCart(a.publicKey())).length, 3);
    const amazon = (await getCart(a.publicKey())).find((x) => x.merchant === "AMAZON")!;
    assert.equal(amazon.title, "Amazon test ürünü");
    assert.equal(amazon.unitTry, "400.00");
    assert.equal(amazon.unitUsd, "11.00");
    assert.equal(amazon.imageUrl, "https://m.media-amazon.com/images/I/test.jpg");
    assert.equal(
      (await getCart(a.publicKey())).find((x) => x.merchant === "AMAZON")!
        .quantity,
      3,
    );
    assert.deepEqual(await getCart(b.publicKey()), []);
    const item = (await getCart(a.publicKey()))[0];
    await assert.rejects(
      () => changeCart(b.publicKey(), item.id, { quantity: 2 }),
      /bulunamadı/,
    );
    await assert.rejects(() =>
      checkout(a.publicKey(), {
        key: randomUUID(),
        address: { ...address, postalCode: "1" },
      }),
    );
    const key = randomUUID();
    const o = await checkout(a.publicKey(), { key, address });
    assert.equal((await checkout(a.publicKey(), { key, address })).id, o.id);
    assert.equal(await db.order.count(), 1);
    assert.deepEqual(await getCart(a.publicKey()), []);
    await assert.rejects(() => getOrder(o.id, b.publicKey()), /bulunamadı/);
    const full = await getOrder(o.id, a.publicKey());
    assert.equal(full.address!.name, address.name);
    assert.equal(full.items.length, 3);
    assert.equal(full.items.find((item) => item.merchant === "AMAZON")!.unitTry, "400.00");
    assert.equal(full.serviceUsdc, "5");
    const quote = {
      items: full.items.map((x) => ({
        id: x.id,
        title: "Test ürünü",
        unitTry: "10.01",
      })),
      stores: full.stores.map((x) => ({
        merchant: x.merchant,
        shippingTry: "1.01",
      })),
      rate: "3",
      serviceUsdc: "2",
    };
    await assert.rejects(
      () =>
        fulfillStore(o.id, full.stores[0].merchant, { purchaseRef: "TEST" }),
      /ödeme/,
    );
    await assert.rejects(
      () =>
        quoteOrder(o.id, {
          ...quote,
          items: [quote.items[0], quote.items[0], quote.items[0]],
        }),
      /tam olarak/,
    );
    await assert.rejects(
      () => quoteOrder(o.id, { ...quote, stores: [quote.stores[0]] }),
      /tam olarak/,
    );
    const quoted = await quoteOrder(o.id, quote);
    assert.equal(quoted.productTry, "50.05");
    assert.equal(quoted.shippingTry, "3.03");
    assert.equal(quoted.serviceUsdc, "5.0000");
    assert.equal(quoted.totalUsdc, "22.6933334");
    await assert.rejects(
      () => preparePayment(o.id, b.publicKey()),
      /Cüzdan değişti/,
    );
    // Chain payment validation is covered in payment/orders tests; seed only its confirmed result here.
    await db.order.update({
      where: { id: o.id },
      data: {
        status: "PAID",
        paidHash: "basket-test-confirmed",
        payer: a.publicKey(),
      },
    });
    assert.equal(
      (
        await fulfillStore(o.id, full.stores[0].merchant, {
          purchaseRef: "A-123",
        })
      ).status,
      "PARTIALLY_PURCHASED",
    );
    assert.equal(
      (
        await fulfillStore(o.id, full.stores[0].merchant, {
          shippingInfo: "Kargo A-123",
        })
      ).status,
      "PARTIALLY_SHIPPED",
    );
    await fulfillStore(o.id, full.stores[1].merchant, {
      purchaseRef: "B-123",
      shippingInfo: "Kargo B-123",
    });
    assert.equal(
      (
        await fulfillStore(o.id, full.stores[2].merchant, {
          purchaseRef: "C-123",
          shippingInfo: "Kargo C-123",
        })
      ).status,
      "SHIPPED",
    );
    await updateStatus(o.id, { status: "REFUND_PENDING" });
    await assert.rejects(() =>
      fulfillStore(o.id, full.stores[0].merchant, { purchaseRef: "changed" }),
    );
    const legacy = await db.order.create({
      data: {
        url: urls[0],
        quantity: 1,
        notes: "",
        memo: randomUUID().slice(0, 24),
      },
    });
    await assert.rejects(
      () => getOrder(legacy.id, a.publicKey()),
      /bulunamadı/,
    );
    assert.equal((await getOrder(legacy.id)).id, legacy.id);
  } finally {
    await db.$disconnect();
    rmSync(temp, { recursive: true, force: true });
  }
});
