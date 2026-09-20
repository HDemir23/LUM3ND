import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page-shell panel empty">
      <h1>Bu sayfa bulunamadı.</h1>
      <Link href="/orders">Siparişlerime dön →</Link>
    </section>
  );
}
