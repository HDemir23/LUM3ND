export default function Loading() {
  return (
    <div className="page-shell route-loading" role="status" aria-live="polite">
      <span className="loading-bar" aria-hidden="true" />
      <p>Sayfa yükleniyor…</p>
    </div>
  );
}
