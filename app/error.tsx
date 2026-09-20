"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page-shell panel">
      <h1>Sayfa yüklenemedi.</h1>
      <p>Sunucu bağlantısını kontrol edip tekrar dene.</p>
      <button className="button" onClick={reset}>
        Tekrar dene
      </button>
    </section>
  );
}
