"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import Decimal from "decimal.js";
import type { ProductPreview } from "@/lib/products";
import { merchants, parseProductUrl } from "@/lib/domain";
import { ActionForm, Field, api } from "./ui";
import XlmEstimate, { useXlmPrice, XlmAmount, type XlmPriceState } from "./xlm-estimate";
import { productTitle, useCart, type CartItem } from "./cart-state";
export default function Shop({ notice }: { notice?: boolean }) {
  const router = useRouter();
  const { open, setOpen, items, count, reload } = useCart();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [manualQuote, setManualQuote] = useState(false);
  const urlRef = useRef(url);
  urlRef.current = url;
  const pricedItems = items.filter((item) => item.unitUsd);
  const subtotal = pricedItems.reduce((sum, item) => sum.plus(new Decimal(item.unitUsd!).mul(item.quantity)), new Decimal(0)).toFixed(2);
  const xlmQuote = useXlmPrice((open && pricedItems.length > 0) || !!preview);
  const key = useRef("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("url");
    if (value) setUrl(value);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  return (
    <>
      {notice && (
        <div className="access-note">
          Sepetini kaydetmek için{" "}
          <Link
            href={`/login?next=${encodeURIComponent(`/?url=${encodeURIComponent(url)}`)}`}
          >
            cüzdanınla giriş yap
          </Link>
          .
        </div>
      )}
      <section
        className={`glass-card shop-card${open ? " shop-card-cart" : ""}`}
        aria-labelledby="shop-title"
      >
        <div className={open ? "cart-view" : "shop-landing"}>
          <header className="cart-head">
            <h2 id="shop-title">
              {open ? "Sepetin" : "Shop anything with Stablecoins"}
            </h2>
            {open && (
              <button
                className="icon-button"
                aria-label="Sepeti kapat"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            )}
          </header>
          {!open && (
            <div className="shop-banner">
              <p>
                Amazon Türkiye, Hepsiburada ve Trendyol. Tek sepet, tek USDC
                ödemesi.
              </p>
              <div className="shop-brands">
                <img src="/brands/amazon.svg" alt="Amazon Türkiye" />
              </div>
            </div>
          )}
          <ActionForm
            label={manualQuote ? "Fiyatsız sepete ekle" : preview || !/amazon\.com\.tr/i.test(url) ? "Sepete ekle" : "Ürünü getir"}
            buttonClass="mint-btn"
            onSubmit={async (d) => {
              const parsed = parseProductUrl(url);
              if (notice) {
                router.push(
                  `/login?next=${encodeURIComponent(`/?url=${encodeURIComponent(url)}`)}`,
                );
                return;
              }
              if (parsed.merchant === "AMAZON" && !preview && !manualQuote) {
                const requestedUrl = url;
                let product;
                try {
                  product = await api("products", { url: parsed.url });
                } catch (error) {
                  if (urlRef.current === requestedUrl) setManualQuote(true);
                  throw error;
                }
                if (urlRef.current === requestedUrl) setPreview(product);
                return;
              }
              await api("cart", {
                ...parsed,
                quantity: Number(d.get("quantity")),
                manualQuote,
              });
              await reload();
              setOpen(true);
              setPreview(null);
              setManualQuote(false);
              setUrl("");
              key.current = "";
            }}
          >
            <label className="url-label" htmlFor="product-url">
              Ürün bağlantısı
            </label>
            <div className="url-field">
              <MagnifyingGlass size={16} />
              <input
                id="product-url"
                type="url"
                autoComplete="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setPreview(null); setManualQuote(false); }}
                placeholder="https://www.amazon.com.tr/…/dp/…"
                required
                maxLength={2048}
              />
            </div>
            {manualQuote && <p role="status">Otomatik fiyat alınamadı. Ürünü fiyatsız sepete ekleyebilirsin; ürün ve kargo tutarı ödeme öncesinde teklifinde gösterilecek.</p>}
            {preview && (
              <div className="product-preview" role="status">
                <ProductImage src={preview.imageUrl} title={preview.title} />
                <div>
                  <strong>{preview.title}</strong>
                  <p>{preview.unitTry} TL</p>
                  <p>+ <XlmAmount usd="1" quote={xlmQuote} /> hizmet bedeli / adet</p>
                  <strong><XlmAmount usd={preview.unitUsd} quote={xlmQuote} /> / adet</strong>
                  <p className="small muted">TCMB ({preview.rateDate}): 1 USD = {preview.rate} TL. Kargo hariç; kesin tutar teklifte belirlenir.</p>
                  <XlmEstimate quote={xlmQuote} />
                </div>
              </div>
            )}
            <div className="product-quantity">
              <Field
                name="quantity"
                label="Adet"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
                required
              />
            </div>
          </ActionForm>
          {!open && count > 0 && (
            <button className="cart-link" onClick={() => setOpen(true)}>
              {count} adet · Sepeti gör <ArrowUpRight size={14} />
            </button>
          )}
          {open && (
            <div className="cart-body">
              <div>
                {!items.length && (
                  <p className="cart-empty">
                    Sepetin boş. Bir ürün bağlantısı ekle.
                  </p>
                )}
                {items.map((item) => (
                  <CartLine
                    key={`${item.id}-${item.quantity}`}
                    item={item}
                    reload={reload}
                    requestKey={key}
                    xlmQuote={xlmQuote}
                  />
                ))}
              </div>
              <aside className="cart-summary">
                <h3>Teslimat ve teklif</h3>
                <p>
                  Türkiye içinde tek adres. Ürün ve mağaza kargoları teklifinde
                  ayrı gösterilir. Her adet için 1 USD hizmet bedeli eklenir;
                  ödeme USDC ile yapılır.
                </p>
                {pricedItems.length > 0 && (
                  <div className="basket-estimate" aria-live="polite">
                    <span>{pricedItems.length === items.length ? "Tahmini toplam" : "Fiyatı alınan ürünler"}</span>
                    <strong><XlmAmount usd={subtotal} quote={xlmQuote} /></strong>
                    <small>Hizmet bedeli dahil, kargo hariç. Güncel fiyat ve kur teklif sırasında doğrulanır.</small>
                    <XlmEstimate quote={xlmQuote} />
                  </div>
                )}
                {items.length > 0 && (
                  <ActionForm
                    label="Teklif iste"
                    buttonClass="mint-btn mint-btn-block"
                    onSubmit={async (d) => {
                      key.current ||= crypto.randomUUID();
                      const o = await api("orders", {
                        key: key.current,
                        address: Object.fromEntries(d),
                      });
                      await reload();
                      setOpen(false);
                      router.push(`/orders/${o.id}`);
                    }}
                  >
                    <Field
                      name="name"
                      label="Alıcı adı soyadı"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                    <Field
                      name="phone"
                      label="Telefon"
                      type="tel"
                      autoComplete="tel"
                      maxLength={20}
                      required
                    />
                    <Field
                      name="city"
                      label="İl"
                      autoComplete="address-level1"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                    <Field
                      name="district"
                      label="İlçe"
                      autoComplete="address-level2"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                    <Field
                      name="address"
                      label="Açık adres"
                      autoComplete="street-address"
                      minLength={10}
                      maxLength={500}
                      required
                    />
                    <Field
                      name="postalCode"
                      label="Posta kodu"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      required
                    />
                  </ActionForm>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

const CartLine = memo(function CartLine({
  item,
  reload,
  requestKey,
  xlmQuote,
}: {
  item: CartItem;
  reload: () => Promise<void>;
  requestKey: { current: string };
  xlmQuote: XlmPriceState;
}) {
  return (
    <div className="cart-item">
      {item.imageUrl && <ProductImage src={item.imageUrl} title={item.title || productTitle(item.url)} />}
      <div className="cart-item-copy">
        <a href={item.url} target="_blank" rel="noreferrer">
          {item.title || productTitle(item.url)} ↗
        </a>
        <span>
          {merchants[item.merchant]}
        </span>
        {item.unitUsd ? (
          <div className="cart-price">
            <strong><XlmAmount usd={new Decimal(item.unitUsd).mul(item.quantity).toFixed(2)} quote={xlmQuote} /></strong>
            <span>{item.quantity} × <XlmAmount usd={item.unitUsd} quote={xlmQuote} /> / adet · Hizmet bedeli dahil</span>
            <span>{item.unitTry} TL / adet · Kur: {item.rate} · {item.rateDate}</span>
          </div>
        ) : <span>Fiyat teklif sırasında belirlenecek.</span>}
        <ActionForm
          label="Adedi güncelle"
          buttonClass="secondary"
          onSubmit={async (data) => {
            await api(`cart/${item.id}`, {
              quantity: Number(data.get("quantity")),
            });
            await reload();
            requestKey.current = "";
          }}
        >
          <Field
            label="Adet (kaldırmak için 0)"
            name="quantity"
            type="number"
            min={0}
            max={20}
            defaultValue={item.quantity}
            required
          />
        </ActionForm>
      </div>
    </div>
  );
});

function ProductImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="product-image">
      {failed ? <span>Görsel yüklenemedi</span> : <img src={src} alt={title} width={88} height={88} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </div>
  );
}
