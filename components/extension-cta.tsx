export default function ExtensionCta() {
  return (
    <div className="ext-cta">
      <p>Try universal stablecoin shopping</p>
      <button type="button" disabled className="extension-soon">
        <img src="/icons/chrome.svg" width={16} height={16} alt="" />
        <span>Browser extension</span>
        <span className="coming-soon-label">Coming soon</span>
      </button>
    </div>
  );
}
