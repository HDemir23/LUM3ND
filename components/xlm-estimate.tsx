"use client";

import { useEffect, useState } from "react";
import Decimal from "decimal.js";

import { formatXlm, isFreshXlmPrice, MAX_XLM_PRICE_AGE, type XlmPrice } from "@/lib/xlm";
const priceFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 6 });

export function useXlmPrice(enabled: boolean) {
  const [price, setPrice] = useState<XlmPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const controller = new AbortController();
    let running = false;
    async function refresh() {
      if (running) return;
      running = true;
      try {
        const response = await fetch("/api/prices/xlm", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) throw new Error("Price unavailable");
        const value = await response.json();
        const usd = new Decimal(value.usd);
        if (!usd.isFinite() || !usd.gt(0) || !isFreshXlmPrice(value) ||
            !["Coinbase", "CoinGecko"].includes(value.source))
          throw new Error("Invalid price");
        if (!controller.signal.aborted) setPrice({ usd: usd.toString(), updatedAt: value.updatedAt, source: value.source, stale: value.stale === true });
      } catch {
        if (!controller.signal.aborted) setPrice(previous => previous && isFreshXlmPrice(previous) ? { ...previous, stale: true } : null);
      } finally {
        running = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [retry, enabled]);

  useEffect(() => {
    if (!price) return;
    const timer = window.setTimeout(() => setPrice(null), Math.max(0, Date.parse(price.updatedAt) + MAX_XLM_PRICE_AGE - Date.now()));
    return () => window.clearTimeout(timer);
  }, [price]);

  return { price, loading, refresh: () => { setLoading(true); setRetry(value => value + 1); } };
}

export type XlmPriceState = ReturnType<typeof useXlmPrice>;

export function XlmAmount({ usd, quote }: { usd: string; quote: XlmPriceState }) {
  return <>{quote.price ? `≈ ${formatXlm(usd, quote.price.usd)}` : quote.loading ? "XLM kuru alınıyor…" : "XLM kuru alınamadı"}</>;
}

export default function XlmEstimate({ quote }: { quote: XlmPriceState }) {
  const { price, loading, refresh } = quote;

  return (
    <div className="xlm-estimate" aria-live="polite">
      {price ? <>
        <p>1 XLM = {priceFormat.format(Number(price.usd))} USD</p>
        <p className="xlm-estimate-source">
          <a href={price.source === "CoinGecko" ? "https://www.coingecko.com/en/coins/stellar" : "https://www.coinbase.com/price/stellar"} target="_blank" rel="noreferrer">{price.source}</a>
          {" · Alınma: "}{new Date(price.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {price.stale && <p>Kur yenilenemedi; son alınan kur gösteriliyor.</p>}
      </> : !loading && <button type="button" className="xlm-estimate-retry" onClick={refresh}>Kuru yenile</button>}
      <p className="xlm-estimate-note">Bilgilendirme amaçlıdır. Ödeme USDC ile yapılır.</p>
    </div>
  );
}
