"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { labels, merchants } from "@/lib/domain";
import { ActionForm, api, Field, money } from "./ui";
import { BasketDetails, Explorer, type OrderView } from "./order-detail";
export default function Admin({ initial }: { initial: OrderView[] }) {
  const [orders, setOrders] = useState(initial);
  const [selected, setSelected] = useState(initial[0]?.id || "");
  const router = useRouter();
  const o = useMemo(
    () => orders.find((item) => item.id === selected),
    [orders, selected],
  );
  async function reload() {
    const list = await api("admin");
    const full = await Promise.all(
      list.map((x: { id: string }) => api(`admin/${x.id}`)),
    );
    setOrders(full);
    if (!selected) setSelected(full[0]?.id || "");
  }
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const list: OrderView[] = await api("admin");
        const full = await Promise.all(
          list.map(async (item) => {
            const order: OrderView = await api(`admin/${item.id}`);
            if (order.attempts.some((a) => a.state === "PENDING")) {
              try {
                return (await api(`admin/${item.id}/verify`, {})).order;
              } catch {
                return order;
              }
            }
            return order;
          }),
        );
        if (!stopped) setOrders(full);
      } catch {
        /* The manual refresh form also surfaces connectivity failures. */
      }
      if (!stopped) timer = setTimeout(poll, 10000);
    }
    timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERASYON MERKEZİ</div>
          <h1>Sipariş yönetimi</h1>
          <p className="muted">
            Teklifi hazırla, ödemeyi doğrula, satın almayı tamamla.
          </p>
        </div>
        <ActionForm
          label="Çıkış yap"
          onSubmit={async () => {
            await api("auth/logout", { role: "admin" });
            router.push("/login?role=admin");
            router.refresh();
          }}
        >
          <></>
        </ActionForm>
      </div>
      <div className="admin-grid">
        <aside className="panel">
          <h2>
            Talepler <span className="muted">{orders.length}</span>
          </h2>
          <ActionForm label="Listeyi yenile" onSubmit={reload}>
            <></>
          </ActionForm>
          {orders.length === 0 && (
            <p>Henüz talep yok. Kullanıcı ekranından ürün linki ekle.</p>
          )}
          {orders.map((item) => (
            <button
              key={item.id}
              className={`admin-item ${selected === item.id ? "selected" : ""}`}
              onClick={() => setSelected(item.id)}
            >
              <strong>{item.title || "Yeni ürün talebi"}</strong>
              <span>
                {labels[item.status]} · {item.quantity} adet
              </span>
            </button>
          ))}
        </aside>
        {o && (
          <section className="panel" key={o.id}>
            <div className="badge">{labels[o.status]}</div>
            <h2>{o.title || "Ürün bilgilerini ekle"}</h2>
            <p>
              {o.quantity} adet
            </p>
            <a href={o.url} target="_blank" rel="noreferrer">
              {merchants[o.merchant]} ürününü aç ↗
            </a>
            <BasketDetails o={o} />
            {["REQUESTED", "QUOTED"].includes(o.status) && (
              <ActionForm
                label="15 dakikalık teklif oluştur"
                onSubmit={async (d) => {
                  const input = o.items.length
                    ? {
                        items: o.items.map((item) => ({
                          id: item.id,
                          title: d.get(`title-${item.id}`),
                          unitTry: d.get(`price-${item.id}`),
                        })),
                        stores: o.stores.map((store) => ({
                          merchant: store.merchant,
                          shippingTry: d.get(`shipping-${store.merchant}`),
                        })),
                        rate: d.get("rate"),
                        serviceUsdc: String(o.quantity),
                      }
                    : Object.fromEntries(d);
                  await api(`admin/${o.id}/quote`, input);
                  await reload();
                }}
              >
                {o.items.length ? (
                  o.items.map((item) => (
                    <fieldset key={item.id}>
                      <legend>
                        {merchants[item.merchant]} · {item.quantity} adet
                      </legend>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        Ürünü aç ↗
                      </a>
                      <Field
                        name={`title-${item.id}`}
                        label="Ürün adı"
                        defaultValue={item.title || ""}
                        required
                        maxLength={200}
                      />
                      <Field
                        name={`price-${item.id}`}
                        label="Birim fiyat (TRY)"
                        defaultValue={item.unitTry || ""}
                        inputMode="decimal"
                        required
                      />
                    </fieldset>
                  ))
                ) : (
                  <>
                    <Field
                      name="title"
                      label="Ürün adı"
                      defaultValue={o.title || ""}
                      required
                    />
                    <Field
                      name="productTry"
                      label="Birim fiyat (TRY)"
                      inputMode="decimal"
                      required
                    />
                    <Field
                      name="shippingTry"
                      label="Kargo (TRY)"
                      defaultValue="0"
                      required
                    />
                  </>
                )}
                {o.stores.map((store) => (
                  <Field
                    key={store.id}
                    name={`shipping-${store.merchant}`}
                    label={`${merchants[store.merchant]} kargo (TRY)`}
                    defaultValue={store.shippingTry || "0"}
                    inputMode="decimal"
                    required
                  />
                ))}
                <div className="form-grid">
                  <Field
                    name="rate"
                    label="USD/TRY kuru"
                    defaultValue={o.rate || ""}
                    inputMode="decimal"
                    required
                  />
                  <Field
                    name="serviceUsdc"
                    label="Hizmet bedeli (adet başına 1 USDC)"
                    defaultValue={o.items.length ? String(o.quantity) : o.serviceUsdc || String(o.quantity)}
                    readOnly={o.items.length > 0}
                    inputMode="decimal"
                    required
                  />
                </div>
                <p className="small muted">
                  Toplam = (ürünler + mağaza kargoları) / USDTRY + hizmet
                  bedeli. Teklif 15 dakika geçerli.
                </p>
              </ActionForm>
            )}
            {o.totalUsdc && (
              <div className="notice">
                Ürün: {money(o.productTry)} · Kargo: {money(o.shippingTry)} ·
                Hizmet:{" "}
                {o.serviceUsdc
                  ? money(o.serviceUsdc, "USDC")
                  : money(o.commissionTry)}{" "}
                · Toplam: {money(o.totalUsdc, "USDC")}
              </div>
            )}
            {o.paidHash && (
              <p>
                Ödeme: <Explorer hash={o.paidHash} network={o.network} />
              </p>
            )}
            {o.attempts.some((a) => a.state === "PENDING") && (
              <ActionForm
                label="Bekleyen ödemeyi sorgula"
                onSubmit={async () => {
                  await api(`admin/${o.id}/verify`, {});
                  await reload();
                }}
              >
                <p>Ödeme sonucu belirsizken teklif ve durum değiştirilemez.</p>
              </ActionForm>
            )}
            {!o.stores.length && o.status === "PAID" && (
              <ActionForm
                label="Satın alındı olarak kaydet"
                onSubmit={async (d) => {
                  await api(`admin/${o.id}/status`, {
                    status: "PURCHASED",
                    purchaseRef: d.get("purchaseRef"),
                  });
                  await reload();
                }}
              >
                <p>
                  {merchants[o.merchant]} siparişini kendi hesabın ve kartınla
                  manuel oluştur.
                </p>
                <Field
                  name="purchaseRef"
                  label={`${merchants[o.merchant]} sipariş referansı`}
                  required
                  maxLength={200}
                />
              </ActionForm>
            )}
            {o.paidHash &&
              [
                "PAID",
                "PARTIALLY_PURCHASED",
                "PURCHASED",
                "PARTIALLY_SHIPPED",
                "SHIPPED",
              ].includes(o.status) &&
              o.stores.map((store) => (
                <ActionForm
                  key={store.id}
                  label={`${merchants[store.merchant]} kaydını güncelle`}
                  onSubmit={async (d) => {
                    await api(`admin/${o.id}/fulfill`, {
                      merchant: store.merchant,
                      purchaseRef: d.get("purchaseRef"),
                      ...(d.get("shippingInfo")
                        ? { shippingInfo: d.get("shippingInfo") }
                        : {}),
                    });
                    await reload();
                  }}
                >
                  <h3>{merchants[store.merchant]}</h3>
                  <Field
                    name="purchaseRef"
                    label="Mağaza sipariş referansı"
                    defaultValue={store.purchaseRef || ""}
                    maxLength={200}
                    required
                  />
                  <Field
                    name="shippingInfo"
                    label="Kargo firması ve takip numarası"
                    defaultValue={store.shippingInfo || ""}
                    maxLength={500}
                  />
                </ActionForm>
              ))}
            {o.purchaseRef && (
              <p>
                {merchants[o.merchant]} referansı:{" "}
                <strong>{o.purchaseRef}</strong>
              </p>
            )}
            {!o.stores.length && o.status === "PURCHASED" && (
              <ActionForm
                label="Kargolandı olarak kaydet"
                onSubmit={async (d) => {
                  await api(`admin/${o.id}/status`, {
                    status: "SHIPPED",
                    shippingInfo: d.get("shippingInfo"),
                  });
                  await reload();
                }}
              >
                <Field
                  name="shippingInfo"
                  label="Kargo firması ve takip numarası"
                  required
                  maxLength={500}
                />
              </ActionForm>
            )}
            {o.shippingInfo && <p>Kargo: {o.shippingInfo}</p>}
            {[
              "REQUESTED",
              "QUOTED",
              "PAID",
              "PARTIALLY_PURCHASED",
              "PARTIALLY_SHIPPED",
              "PURCHASED",
              "SHIPPED",
            ].includes(o.status) && (
              <ActionForm
                label={
                  ["REQUESTED", "QUOTED"].includes(o.status)
                    ? "Siparişi iptal et"
                    : "İade sürecini başlat"
                }
                onSubmit={async () => {
                  if (!confirm("Bu durum değişikliğini onaylıyor musun?"))
                    return;
                  await api(`admin/${o.id}/status`, {
                    status: ["REQUESTED", "QUOTED"].includes(o.status)
                      ? "CANCELLED"
                      : "REFUND_PENDING",
                  });
                  await reload();
                }}
              >
                <></>
              </ActionForm>
            )}
            {o.status === "REFUND_PENDING" && (
              <>
                <h3>Manuel tam iade</h3>
                <p>
                  Aşağıdaki bilgilerle yönetici cüzdanında tek USDC ödeme işlemi
                  imzala. Sonra işlem hash’ini doğrula.
                </p>
                <dl className="refund-details">
                  <dt>Ağ</dt>
                  <dd>{o.network}</dd>
                  <dt>Gönderen</dt>
                  <dd>{o.receiver}</dd>
                  <dt>Alıcı</dt>
                  <dd>{o.payer}</dd>
                  <dt>USDC issuer</dt>
                  <dd>{o.issuer}</dd>
                  <dt>Tutar</dt>
                  <dd>{o.totalUsdc} USDC</dd>
                  <dt>Text memo</dt>
                  <dd>R{o.memo}</dd>
                </dl>
                <ActionForm
                  label="İadeyi zincirden doğrula"
                  onSubmit={async (d) => {
                    await api(`admin/${o.id}/refund`, { hash: d.get("hash") });
                    await reload();
                  }}
                >
                  <Field
                    name="hash"
                    label="İade işlem hash’i"
                    required
                    minLength={64}
                    maxLength={64}
                  />
                </ActionForm>
              </>
            )}
            {o.refundHash && (
              <p>
                İade: <Explorer hash={o.refundHash} network={o.network} />
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
