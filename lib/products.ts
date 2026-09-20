import { load } from "cheerio";
import Decimal from "decimal.js";
import { z } from "zod";
import { AppError, parseProductUrl } from "./domain";

const unavailable = () => new AppError(
  "Amazon ürün bilgisi alınamadı. Ürün stokta olmayabilir veya Amazon erişimi engelliyor olabilir. Lütfen tekrar deneyin.", 502,
);
const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  imageUrl: z.url().refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      (u.hostname.endsWith(".media-amazon.com") || u.hostname.endsWith(".ssl-images-amazon.com"));
  }),
  unitTry: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => new Decimal(v).gt(0) && new Decimal(v).lte(9999999)),
});

export function parseAmazonHtml(html: string) {
  const $ = load(html);
  if ($('form[action*="validateCaptcha"], #captchacharacters').length) throw unavailable();
  const title = $("#productTitle").text().trim().replace(/\s+/g, " ").slice(0, 200);
  const image = $("#landingImage, #imgBlkFront").first();
  const imageUrl = image.attr("data-old-hires") || image.attr("src");
  // Only the main purchase area: never related products, instalments or list prices.
  let price = "";
  for (const selector of [
    "#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen",
    "#corePrice_feature_div .a-price:not(.a-text-price) .a-offscreen",
    "#apex_desktop .priceToPay .a-offscreen",
    "#priceblock_ourprice", "#priceblock_dealprice",
  ]) {
    price = $(selector).first().text().trim();
    if (price) break;
  }
  if (!/(?:TL|₺|TRY)/i.test(price)) throw unavailable();
  const unitTry = price.replace(/(?:TL|₺|TRY)|\s/g, "").replace(/\./g, "").replace(",", ".");
  const result = productSchema.safeParse({ title, imageUrl, unitTry });
  if (!result.success) throw unavailable();
  return result.data;
}

export function parseRainforestProduct(body: unknown, asin: string) {
  const result = z.object({
    request_info: z.object({ success: z.literal(true) }),
    product: z.object({
      asin: z.string(), title: z.string(), main_image: z.object({ link: z.string() }),
      buybox_winner: z.object({
        price: z.object({ value: z.number().positive(), currency: z.literal("TRY") }),
        availability: z.object({ type: z.string() }).optional(),
      }),
    }),
  }).safeParse(body);
  if (!result.success || result.data.product.asin !== asin) throw unavailable();
  const product = result.data.product;
  if (product.buybox_winner.availability?.type === "out_of_stock") throw unavailable();
  const parsed = productSchema.safeParse({
    title: product.title.slice(0, 200), imageUrl: product.main_image.link,
    unitTry: String(product.buybox_winner.price.value),
  });
  if (!parsed.success) throw unavailable();
  return parsed.data;
}

export function parseUsdRate(xml: string, now = Date.now()) {
  const $ = load(xml, { xmlMode: true });
  const date = $("Tarih_Date").attr("Tarih") || "";
  const [day, month, year] = date.split(".").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const rate = $('Currency[CurrencyCode="USD"] ForexSelling').text().trim();
  if (!/^\d+(\.\d+)?$/.test(rate) || !new Decimal(rate).gt(0) ||
      !Number.isFinite(timestamp) || now - timestamp > 7 * 86400000 || timestamp > now + 86400000) {
    throw new AppError("Güncel dolar kuru alınamadı. Lütfen tekrar deneyin.", 502);
  }
  return { rate, rateDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

export function productPricing(unitTry: string, rate: string) {
  if (!new Decimal(unitTry).gt(0) || !new Decimal(rate).gt(0)) throw new AppError("Geçersiz ürün fiyatı veya kur.");
  const productUsd = new Decimal(unitTry).div(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return { productUsd: productUsd.toFixed(2), serviceUsd: "1.00", unitUsd: productUsd.plus(1).toFixed(2) };
}

export type ProductPreview = {
  url: string; merchant: string; title: string; imageUrl: string; unitTry: string;
  rate: string; rateDate: string; fetchedAt: string;
  productUsd: string; serviceUsd: string; unitUsd: string;
};

// Short, bounded server cache keeps preview and cart consistent and limits provider calls.
const cache = new Map<string, { expires: number; value: Promise<ProductPreview> }>();
const attempts = new Map<string, { count: number; expires: number }>();
export function limitProductLookup(wallet: string) {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.expires <= now) attempts.delete(key);
  const entry = attempts.get(wallet) ?? { count: 0, expires: now + 60000 };
  if (entry.count >= 20 || (!attempts.has(wallet) && attempts.size >= 10000))
    throw new AppError("Çok fazla ürün sorgusu. Bir dakika sonra tekrar deneyin.", 429);
  entry.count++;
  attempts.set(wallet, entry);
}
async function fetchText(url: string, timeout = 15000) {
  const res = await fetch(url, {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeout),
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "tr-TR,tr;q=0.9" },
  });
  if (!res.ok) throw unavailable();
  const reader = res.body?.getReader();
  if (!reader) throw unavailable();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 5_000_000) { await reader.cancel(); throw unavailable(); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function lookupProduct(value: string): Promise<ProductPreview> {
  const parsed = parseProductUrl(value);
  if (parsed.merchant !== "AMAZON") throw new AppError("Otomatik ürün bilgisi şu an yalnızca Amazon Türkiye için kullanılabilir.");
  const asin = new URL(parsed.url).pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)![1].toUpperCase();
  const url = `https://www.amazon.com.tr/dp/${asin}`;
  const previous = cache.get(url);
  if (previous && previous.expires > Date.now()) return previous.value;
  const pending = (async () => {
    try {
      const apiKey = process.env.RAINFOREST_API_KEY;
      let product;
      if (apiKey) {
        const endpoint = new URL("https://api.rainforestapi.com/request");
        endpoint.search = new URLSearchParams({ api_key: apiKey, type: "product", amazon_domain: "amazon.com.tr", asin, currency: "TRY" }).toString();
        product = parseRainforestProduct(JSON.parse(await fetchText(endpoint.href, 45000)), asin);
      } else {
        product = parseAmazonHtml(await fetchText(url));
      }
      const fx = parseUsdRate(await fetchText("https://www.tcmb.gov.tr/kurlar/today.xml"));
      return { ...parsed, url, ...product, ...fx, ...productPricing(product.unitTry, fx.rate), fetchedAt: new Date().toISOString() };
    } catch (error) {
      cache.delete(url);
      if (error instanceof AppError) throw error;
      // Never expose provider URLs or credentials through errors/logging.
      throw unavailable();
    }
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(url, { value: pending, expires: Date.now() + 5 * 60000 });
  return pending;
}
