import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmazonHtml, parseRainforestProduct, parseUsdRate, productPricing, lookupProduct } from "../lib/products";
import { calculateBasketQuote } from "../lib/domain";

const html = `<span id="productTitle">USB &amp; HDMI Adaptör</span>
  <img id="landingImage" src="https://m.media-amazon.com/images/I/product.jpg">
  <div class="a-price"><span class="a-offscreen">12,00 TL</span></div>
  <div id="corePrice_feature_div"><span class="a-price a-text-price"><span class="a-offscreen">2.000,00 TL</span></span>
  <span class="a-price"><span class="a-offscreen">1.234,56 TL</span></span></div>`;

test("Amazon price uses the main offer, excludes list and recommended prices", () => {
  assert.deepEqual(parseAmazonHtml(html), {
    title: "USB & HDMI Adaptör", imageUrl: "https://m.media-amazon.com/images/I/product.jpg", unitTry: "1234.56",
  });
  for (const bad of [html.replace("1.234,56 TL", "$12.00"), html.replace("1.234,56 TL", ""), html.replace("https://m.media-amazon.com", "http://localhost"), '<form action="/errors/validateCaptcha"></form>'])
    assert.throws(() => parseAmazonHtml(bad), /alınamadı/);
});

test("10 USD product costs 11 per unit; fee counts units and cannot be overridden", () => {
  assert.deepEqual(productPricing("400", "40"), { productUsd: "10.00", serviceUsd: "1.00", unitUsd: "11.00" });
  assert.throws(() => productPricing("400", "0"));
  const total = calculateBasketQuote({ items: [{ id: "a", title: "Adaptör", unitTry: "400" }], stores: [{ merchant: "AMAZON", shippingTry: "0" }], rate: "40", serviceUsdc: "999" }, [{ id: "a", quantity: 2 }]);
  assert.equal(total.totalUsdc, "22.0000000");
  assert.equal(total.serviceUsdc, "2.0000");
});

test("TCMB selects USD selling rate, accepts weekend bulletin, rejects stale rates", () => {
  const xml = '<Tarih_Date Tarih="18.09.2026"><Currency CurrencyCode="USD"><ForexBuying>39</ForexBuying><ForexSelling>40.0000</ForexSelling></Currency></Tarih_Date>';
  assert.deepEqual(parseUsdRate(xml, Date.UTC(2026, 8, 20)), { rate: "40.0000", rateDate: "2026-09-18" });
  assert.throws(() => parseUsdRate(xml, Date.UTC(2026, 8, 30)), /kur/);
  assert.throws(() => parseUsdRate(xml.replace("40.0000", "0"), Date.UTC(2026, 8, 20)), /kur/);
});

test("provider rejects mismatched ASIN, missing price and incorrect currency", () => {
  const body = { request_info: { success: true }, product: { asin: "B0C542VM4P", title: "Adaptör", main_image: { link: "https://m.media-amazon.com/images/I/product.jpg" }, buybox_winner: { price: { value: 400, currency: "TRY" } } } };
  assert.equal(parseRainforestProduct(body, "B0C542VM4P").unitTry, "400");
  assert.throws(() => parseRainforestProduct(body, "B012345678"));
  body.product.buybox_winner.price.currency = "USD";
  assert.throws(() => parseRainforestProduct(body, "B0C542VM4P"));
  assert.throws(() => parseRainforestProduct({}, "B0C542VM4P"));
});

test("lookup validates URLs before fetching, uses canonical ASIN and retries failures", async (t) => {
  delete process.env.RAINFOREST_API_KEY;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    calls++;
    assert.equal(options.redirect, "error");
    assert.equal(url, "https://www.amazon.com.tr/dp/B0C542VM4P");
    return new Response('<form action="/errors/validateCaptcha"></form>');
  });
  await assert.rejects(() => lookupProduct("https://localhost/dp/B0C542VM4P"));
  assert.equal(calls, 0);
  await assert.rejects(() => lookupProduct("https://www.amazon.com.tr/urun/dp/B0C542VM4P?tag=tracking"));
  await assert.rejects(() => lookupProduct("https://www.amazon.com.tr/dp/B0C542VM4P"));
  assert.equal(calls, 2);
});
