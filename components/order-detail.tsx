"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  requestAccess,
  getNetworkDetails,
  signTransaction,
} from "@stellar/freighter-api";
import { labels, merchants } from "@/lib/domain";
import { api, money } from "./ui";
export type OrderView = {
  wallet: string | null;
  serviceUsdc: string | null;
  items: {
    id: string;
    url: string;
    merchant: string;
    quantity: number;
    notes: string;
    title: string | null;
    unitTry: string | null;
  }[];
  stores: {
    id: string;
    merchant: string;
    shippingTry: string | null;
    purchaseRef: string | null;
    shippingInfo: string | null;
  }[];
  address: {
    name: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    postalCode: string;
  } | null;
  id: string;
  merchant: string;
  memo: string;
  url: string;
  quantity: number;
  notes: string;
  status: string;
  title: string | null;
  productTry: string | null;
  shippingTry: string | null;
  commissionTry: string | null;
  totalUsdc: string | null;
  rate: string | null;
  expiresAt: string | null;
  network: string | null;
  issuer: string | null;
  receiver: string | null;
  payer: string | null;
  paidHash: string | null;
  refundHash: string | null;
  purchaseRef: string | null;
  shippingInfo: string | null;
  attempts: { hash: string; state: string; maxTime: number; payer: string }[];
};
export function Explorer({
  hash,
  network,
}: {
  hash: string;
  network: string | null;
}) {
  return (
    <a
      className="hash"
      target="_blank"
      rel="noreferrer"
      href={`https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}/tx/${hash}`}
    >
      {hash.slice(0, 12)}…{hash.slice(-8)} ↗
    </a>
  );
}
export default function OrderDetail({ initial }: { initial: OrderView }) {
  const [o, setO] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const pending = o.attempts.find((a) => a.state === "PENDING");
  const shouldPoll = o.status === "QUOTED" && Boolean(pending);
  useEffect(() => {
    const tick =
      o.status === "QUOTED" && o.expiresAt
        ? window.setInterval(() => setNow(Date.now()), 1000)
        : undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = shouldPoll
          ? (await api(`orders/${o.id}/verify`, {})).order
          : await api(`orders/${o.id}`);
        if (!stopped) setO(next);
      } catch (e) {
        if (!stopped) setMessage((e as Error).message);
      }
      if (!stopped) timer = setTimeout(poll, 10000);
    }
    timer = setTimeout(poll, shouldPoll ? 0 : 10000);
    return () => {
      if (tick) window.clearInterval(tick);
      stopped = true;
      clearTimeout(timer);
    };
  }, [o.id, o.status, o.expiresAt, shouldPoll]);
  const remaining = useMemo(
    () =>
      Math.max(
        0,
        Math.floor((new Date(o.expiresAt || 0).getTime() - now) / 1000),
      ),
    [o.expiresAt, now],
  );
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    const result = await api(`orders/${o.id}/verify`, {});
    setO(result.order);
    setMessage(
      (
        {
          PENDING:
            "İşlem henüz zincirde görünmüyor. Tekrar ödeme yapmadan durumunu sorgula.",
          EXPIRED:
            "İşlemin süresi doldu ve zincirde ödeme bulunamadı. Yeni teklif alabilirsin.",
          FAILED:
            "Zincir işlemi başarısız. Bakiyeni ve trustline ayarlarını kontrol et.",
          NONE: "Henüz bir ödeme hazırlanmadı.",
          PAID: "Ödeme doğrulandı.",
        } as Record<string, string>
      )[result.state],
    );
  }
  async function pay() {
    const access = await requestAccess();
    if (access.error || !access.address)
      throw new Error(
        "Freighter bağlantısı reddedildi veya eklenti bulunamadı. Masaüstünde Freighter’ı aç.",
      );
    if (access.address !== o.wallet)
      throw new Error("Cüzdan değişti. Giriş ekranından yeniden giriş yapın.");
    const net = await getNetworkDetails();
    const expected =
      o.network === "mainnet"
        ? "Public Global Stellar Network ; September 2015"
        : "Test SDF Network ; September 2015";
    if (net.error || net.networkPassphrase !== expected)
      throw new Error(`Freighter ağını ${o.network} olarak değiştir.`);
    const prepared = await api(`orders/${o.id}/prepare`, {
      payer: access.address,
    });
    setO(await api(`orders/${o.id}`));
    const signed = await signTransaction(prepared.xdr, {
      networkPassphrase: prepared.passphrase,
      address: access.address,
    });
    if (signed.error || !signed.signedTxXdr) {
      setO(await api(`orders/${o.id}`));
      throw new Error(
        "İmza onaylanmadı. Siparişin ödeme beklemeye devam ediyor.",
      );
    }
    const result = await api(`orders/${o.id}/submit`, {
      signedXdr: signed.signedTxXdr,
    });
    setO(result.order);
    setMessage(
      result.state === "PAID"
        ? "Ödemen doğrulandı."
        : "İşlem sonucu bekleniyor. Mevcut işlemi sorgula.",
    );
  }
  const steps = ["REQUESTED", "QUOTED", "PAID", "PURCHASED", "SHIPPED"];
  const active = steps.indexOf(o.status);
  return (
    <div className="page-shell">
      <Link className="back" href="/orders">
        ← Siparişlerim
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            SİPARİŞ #{o.memo.slice(0, 8).toUpperCase()}
          </div>
          <h1>{o.title || "Ürünün için teklif hazırlıyoruz."}</h1>
          <p className="muted">
            {o.quantity} adet
          </p>
        </div>
        <span className="badge">{labels[o.status]}</span>
      </div>
      <div className="detail-grid">
        <section>
          <div className="panel">
            <BasketDetails o={o} />
            <h2>Sipariş yolculuğu</h2>
            <ol className="timeline">
              {steps.map((s, i) => (
                <li key={s} className={i <= active ? "done" : ""}>
                  <span>{i < active ? "✓" : i + 1}</span>
                  <div>
                    <strong>{labels[s]}</strong>
                    {s === o.status && <p>Şu an bu adımdasın.</p>}
                  </div>
                </li>
              ))}
            </ol>
            {active < 0 && <p className="notice">{labels[o.status]}</p>}
            <a href={o.url} target="_blank" rel="noreferrer">
              {merchants[o.merchant]} ürününü gör ↗
            </a>
          </div>
          {(o.purchaseRef || o.shippingInfo || o.paidHash) && (
            <div className="panel">
              <h2>Sipariş kayıtları</h2>
              {o.purchaseRef && (
                <p>
                  {merchants[o.merchant]} referansı:{" "}
                  <strong>{o.purchaseRef}</strong>
                </p>
              )}
              {o.shippingInfo && <p>Kargo: {o.shippingInfo}</p>}
              {o.paidHash && (
                <p>
                  Ödeme: <Explorer hash={o.paidHash} network={o.network} />
                </p>
              )}
              {o.refundHash && (
                <p>
                  İade: <Explorer hash={o.refundHash} network={o.network} />
                </p>
              )}
            </div>
          )}
        </section>
        <aside className="panel quote">
          <h2>Teklifin</h2>
          {o.totalUsdc ? (
            <>
              <div className="price-row">
                <span>Ürünler · {o.quantity} adet</span>
                <b>{money(o.productTry)}</b>
              </div>
              <div className="price-row">
                <span>Kargo</span>
                <b>{money(o.shippingTry)}</b>
              </div>
              <div className="price-row">
                <span>Hizmet bedeli</span>
                <b>
                  {o.serviceUsdc
                    ? money(o.serviceUsdc, "USDC")
                    : money(o.commissionTry)}
                </b>
              </div>
              <div className="quote-total">
                <span>Ödenecek toplam</span>
                <strong>{money(o.totalUsdc, "USDC")}</strong>
                <small>
                  1 USD = {money(o.rate)} · 1 USDC = 1 USD varsayımı
                </small>
              </div>
              <p className="small muted">
                Stellar işlem ücreti ayrıca XLM olarak cüzdanından alınır.
              </p>
              {o.status === "QUOTED" && (
                <>
                  <p className={remaining ? "timer" : "error"}>
                    {remaining
                      ? `Teklif süresi: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                      : "Teklif süresi doldu. Yönetici yeni teklif hazırlamalı."}
                  </p>
                  <details>
                    <summary>Ödeme bilgileri</summary>
                    <p>Ağ: {o.network}</p>
                    <p className="break">Alıcı: {o.receiver}</p>
                    <p className="break">USDC issuer: {o.issuer}</p>
                    <p className="break">Memo: {o.memo}</p>
                  </details>
                  {!pending && (
                    <button
                      className="button full"
                      disabled={busy || !remaining}
                      onClick={() => run(pay)}
                    >
                      Freighter ile öde ↗
                    </button>
                  )}
                  {pending && (
                    <>
                      <button
                        className="button full"
                        disabled={busy}
                        onClick={() => run(verify)}
                      >
                        Mevcut işlemi sorgula
                      </button>
                      <button
                        className="secondary full"
                        disabled={busy || !remaining}
                        onClick={() => run(pay)}
                      >
                        Aynı işlemi imzala / yeniden gönder
                      </button>
                      <p className="small muted">
                        Yalnızca aynı işlem gönderilir; ikinci ödeme
                        oluşturulmaz.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="empty">
              <p>
                Ürün fiyatı ve stok kontrol ediliyor. Teklifin hazır olduğunda
                burada görünecek.
              </p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => setO(await api(`orders/${o.id}`)))
                }
              >
                Durumu yenile
              </button>
            </div>
          )}
          {["REQUESTED", "QUOTED"].includes(o.status) && !pending && (
            <button
              className="secondary full"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (
                    !confirm(
                      "Talebi iptal edip ürünleri veya adresi yeniden girmek istiyor musun?",
                    )
                  )
                    return;
                  await api(`orders/${o.id}/cancel`, {});
                  setO(await api(`orders/${o.id}`));
                })
              }
            >
              Talebi iptal et
            </button>
          )}
          {o.status === "CANCELLED" && (
            <Link href="/">Yeni sepet ve adresle teklif iste →</Link>
          )}
          <p aria-live="polite" className="feedback">
            {busy ? "İşlem sürüyor…" : message}
          </p>
        </aside>
      </div>
    </div>
  );
}

export function BasketDetails({ o }: { o: OrderView }) {
  return (
    <div className="basket-details">
      {o.items?.length > 0 && (
        <>
          <h3>Ürünler</h3>
          {o.items.map((item) => (
            <div className="price-row" key={item.id}>
              <div>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title || merchants[item.merchant]} ↗
                </a>
                <p>
                  {item.quantity} adet
                </p>
              </div>
              <b>
                {item.unitTry
                  ? `${money(item.unitTry)} / adet`
                  : "Fiyat bekliyor"}
              </b>
            </div>
          ))}
        </>
      )}
      {o.address && (
        <>
          <h3>Teslimat adresi</h3>
          <p>
            {o.address.name} · {o.address.phone}
          </p>
          <p>
            {o.address.address}
            <br />
            {o.address.district} / {o.address.city} · {o.address.postalCode} ·
            Türkiye
          </p>
        </>
      )}
      {o.stores?.map((store) => (
        <div key={store.id}>
          <h3>{merchants[store.merchant]}</h3>
          <p>Kargo bedeli: {money(store.shippingTry)}</p>
          {store.purchaseRef && (
            <p>Satın alma referansı: {store.purchaseRef}</p>
          )}
          {store.shippingInfo && <p>Kargo takibi: {store.shippingInfo}</p>}
        </div>
      ))}
    </div>
  );
}
