import { isFreshXlmPrice, type XlmPrice } from "./xlm";

async function fetchPrice(source: XlmPrice["source"], signal: AbortSignal): Promise<XlmPrice> {
  const url = source === "Coinbase"
    ? "https://api.coinbase.com/v2/prices/XLM-USD/spot"
    : "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(4_000)]),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${source}: XLM price unavailable`);
  const body = await response.json();
  let usd: unknown;
  if (source === "Coinbase") {
    if (body?.data?.base !== "XLM" || body?.data?.currency !== "USD")
      throw new Error("Invalid Coinbase pair");
    usd = body.data.amount;
  } else {
    if (typeof body?.stellar?.usd !== "number")
      throw new Error("Invalid CoinGecko price");
    usd = String(body.stellar.usd);
  }
  if (typeof usd !== "string" || !/^\d+(\.\d+)?$/.test(usd) ||
      !Number.isFinite(Number(usd)) || Number(usd) <= 0)
    throw new Error("Invalid XLM price");
  // Expose retrieval time, not a claimed trade timestamp.
  return { usd, updatedAt: new Date().toISOString(), source };
}

export function createXlmPriceLoader() {
  let cached: XlmPrice | undefined;
  let pending: Promise<XlmPrice> | undefined;
  let retryAfter = 0;
  return async function getPrice(): Promise<XlmPrice> {
    if (cached && Date.now() - Date.parse(cached.updatedAt) < 60_000) return cached;
    try {
      if (Date.now() < retryAfter) throw new Error("Price providers cooling down");
      // Race validated quotes so an unreachable provider cannot delay the other.
      pending ??= (async () => {
        const controller = new AbortController();
        try {
          const value = await Promise.any([
            fetchPrice("Coinbase", controller.signal),
            fetchPrice("CoinGecko", controller.signal),
          ]);
          cached = value;
          return value;
        } catch (error) {
          retryAfter = Date.now() + 30_000;
          throw error;
        } finally {
          controller.abort();
          pending = undefined;
        }
      })();
      return await pending;
    } catch (error) {
      if (cached && isFreshXlmPrice(cached)) return { ...cached, stale: true };
      throw error;
    }
  };
}

export const getXlmPrice = createXlmPriceLoader();
