import Link from "next/link";
import Logout from "@/components/logout";
import { redirect } from "next/navigation";
import { roleSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { labels } from "@/lib/domain";
export default async function Page() {
  const session = await roleSession("user");
  if (!session?.wallet) redirect("/login");
  const orders = await db.order.findMany({
    where: { wallet: session.wallet },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <section className="page-shell">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ALIŞVERİŞİNİN HER ADIMI</div>
          <h1>Siparişlerim</h1>
        </div>
        <Link className="button" href="/">
          Yeni ürün ekle ↗
        </Link>
      </div>
      {!orders.length ? (
        <div className="panel empty">
          <h2>İlk linkini bekliyoruz.</h2>
          <p>
            Amazon Türkiye, Trendyol veya Hepsiburada’dan bir ürün seçerek
            başla.
          </p>
          <Link href="/">Teklif iste →</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link className="order-row" key={o.id} href={`/orders/${o.id}`}>
              <div>
                <span className="muted small">
                  {new Date(o.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                  {o.quantity} adet
                </span>
                <h2>{o.title || "Yeni ürün talebi"}</h2>
                <span className="small">
                  #{o.memo.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <span className="badge">{labels[o.status]}</span>
              <span aria-hidden>↗</span>
            </Link>
          ))}
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <Logout />
      </div>
    </section>
  );
}
