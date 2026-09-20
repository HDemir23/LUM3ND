import { test } from "node:test";
import assert from "node:assert/strict";
import { createXlmPriceLoader } from "../lib/xlm-price";
import { formatXlm, isFreshXlmPrice, MAX_XLM_PRICE_AGE } from "../lib/xlm";

const coinbase = { data: { base: "XLM", currency: "USD", amount: "0.25" } };

test("CoinGecko resolves even while Coinbase is unreachable; concurrent baskets share requests", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    calls++;
    if (url.includes("coinbase")) return new Promise((_resolve, reject) => {
      options.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    return Response.json({ stellar: { usd: 0.2 } });
  });
  const get = createXlmPriceLoader();
  const [first, second] = await Promise.all([get(), get()]);
  assert.equal(first.source, "CoinGecko");
  assert.equal(first.usd, "0.2");
  assert.deepEqual(first, second);
  assert.deepEqual(await get(), first);
  assert.equal(calls, 2);
});

test("invalid quotes cannot win the race against a valid provider", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => Response.json(
    url.includes("coinbase") ? { data: { ...coinbase.data, base: "BTC" } } : { stellar: { usd: 0.25 } },
  ));
  assert.equal((await createXlmPriceLoader()()).source, "CoinGecko");
  for (const usd of [0, -1, null, "0.2", "NaN"]) {
    t.mock.method(globalThis, "fetch", async (url: string) => Response.json(
      url.includes("coinbase") ? { data: { ...coinbase.data, amount: "0" } } : { stellar: { usd } },
    ));
    await assert.rejects(createXlmPriceLoader()());
  }
});

test("provider outages retain a recent quote, respect cooldown, and expire after ten minutes", async (t) => {
  let now = Date.UTC(2026, 8, 20);
  t.mock.timers.enable({ apis: ["Date"], now });
  let online = true;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls++;
    if (!online || !url.includes("coinbase")) return new Response(null, { status: 503 });
    return Response.json(coinbase);
  });
  const get = createXlmPriceLoader();
  const first = await get();
  online = false;
  now += 61_000;
  t.mock.timers.setTime(now);
  assert.deepEqual(await get(), { ...first, stale: true });
  assert.deepEqual(await get(), { ...first, stale: true });
  assert.equal(calls, 4);
  t.mock.timers.setTime(Date.parse(first.updatedAt) + MAX_XLM_PRICE_AGE);
  await assert.rejects(get());
  online = true;
  t.mock.timers.setTime(Date.parse(first.updatedAt) + MAX_XLM_PRICE_AGE + 31_000);
  assert.equal((await get()).stale, undefined);
});

test("USD totals including quantity and service fee convert with decimal precision", () => {
  assert.equal(formatXlm("22.00", "0.2"), "110 XLM");
  assert.equal(formatXlm("11.00", "0.2"), "55 XLM");
  assert.equal(formatXlm("1.00", "0.2"), "5 XLM");
  assert.equal(formatXlm("1", "3"), "0,3333 XLM");
  assert.equal(formatXlm("0", "0.2"), "0 XLM");
  assert.throws(() => formatXlm("1", "0"));
});

test("freshness rejects expired, invalid and future timestamps", () => {
  const now = Date.now();
  const price = { usd: "0.2", source: "CoinGecko" as const, updatedAt: new Date(now).toISOString() };
  assert.equal(isFreshXlmPrice(price, now), true);
  assert.equal(isFreshXlmPrice(price, now + MAX_XLM_PRICE_AGE), false);
  assert.equal(isFreshXlmPrice({ ...price, updatedAt: "bad" }, now), false);
  assert.equal(isFreshXlmPrice(price, now - 61_000), false);
});
