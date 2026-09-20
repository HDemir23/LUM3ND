import Decimal from "decimal.js";

export const MAX_XLM_PRICE_AGE = 10 * 60_000;
export type XlmPrice = {
  usd: string;
  updatedAt: string;
  source: "Coinbase" | "CoinGecko";
  stale?: boolean;
};

export function isFreshXlmPrice(price: XlmPrice, now = Date.now()) {
  const updated = Date.parse(price.updatedAt);
  return Number.isFinite(updated) && updated <= now + 60_000 && now - updated < MAX_XLM_PRICE_AGE;
}

const amountFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
export function formatXlm(usd: Decimal.Value, priceUsd: string) {
  const price = new Decimal(priceUsd);
  const amount = new Decimal(usd);
  if (!price.isFinite() || !price.gt(0) || !amount.isFinite() || amount.lt(0))
    throw new Error("Invalid XLM amount");
  return `${amountFormat.format(amount.div(price).toNumber())} XLM`;
}
