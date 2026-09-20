import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuote,
  orderInput,
  quoteInput,
  assertTransition,
} from "../lib/domain";
test("quote computes quantity, service fee and total exactly", () => {
  assert.deepEqual(
    calculateQuote(
      { title: "Ürün", productTry: "1000", shippingTry: "100", rate: "40" },
      2,
    ),
    {
      productTry: "2000.00",
      shippingTry: "100.00",
      commissionTry: "0.00",
      serviceUsdc: "2.0000",
      rate: "40.0000",
      totalUsdc: "54.5000000",
    },
  );
});
test("quote rounds USDC upward at seven decimals with a fixed USDC service fee", () => {
  assert.equal(
    calculateQuote(
      { title: "Ürün", productTry: "1.10", shippingTry: "0", rate: "3" },
      1,
    ).totalUsdc,
    "1.3666667",
  );
  assert.throws(() =>
    calculateQuote(
      { title: "Ürün", productTry: "1", shippingTry: "0", rate: "0" },
      1,
    ),
  );
  assert.equal(
    quoteInput.safeParse({
      title: "Ürün",
      productTry: "0.001",
      shippingTry: "0",
      rate: "1",
    }).success,
    false,
  );
});
test("only HTTPS Amazon TR product URLs accepted; tracking removed", () => {
  assert.equal(
    orderInput.parse({
      url: "https://www.amazon.com.tr/name/dp/B012345678?tag=tracking",
      quantity: 1,
    }).url,
    "https://www.amazon.com.tr/name/dp/B012345678",
  );
  for (const url of [
    "https://amazon.com.tr.evil.com/dp/B012345678",
    "https://evil.com/amazon.com.tr/dp/B012345678",
    "http://amazon.com.tr/dp/B012345678",
    "https://amazon.com.tr/search",
    "https://user@amazon.com.tr/dp/B012345678",
    "https://amazon.com.tr:444/dp/B012345678",
  ])
    assert.equal(
      orderInput.safeParse({ url, quantity: 1 }).success,
      false,
      url,
    );
});
test("cannot skip verified payment or mark refund by status mutation", () => {
  assert.throws(() => assertTransition("QUOTED", "PAID"));
  assert.throws(() => assertTransition("PAID", "SHIPPED"));
  assert.throws(() => assertTransition("REFUND_PENDING", "REFUNDED"));
  assert.throws(() => assertTransition("PAID", "CANCELLED"));
  assert.doesNotThrow(() => assertTransition("PAID", "PURCHASED"));
  assert.doesNotThrow(() => assertTransition("SHIPPED", "REFUND_PENDING"));
});

test("Trendyol and Hepsiburada products use the same validated flow", () => {
  for (const [url, merchant] of [
    ["https://www.trendyol.com/marka/urun-p-123456?boutiqueId=1", "TRENDYOL"],
    ["https://www.hepsiburada.com/urun-p-HBCV0000123456", "HEPSIBURADA"],
    ["https://hepsiburada.com/urun-pm-HBC0000123456", "HEPSIBURADA"],
  ])
    assert.equal(orderInput.parse({ url, quantity: 1 }).merchant, merchant);
  for (const url of [
    "https://trendyol.com.evil.com/a-p-123",
    "https://hepsiburada.com/search",
    "https://ty.gl/short",
    "https://trendyol.com/magaza/store",
  ])
    assert.equal(orderInput.safeParse({ url, quantity: 1 }).success, false);
});
