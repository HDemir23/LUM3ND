// Yerel sunucu origin'i değişirse bu değeri güncelleyip extension'ı yeniden yükleyin.
const APP_ORIGIN = "http://localhost:3000";
document.getElementById("add").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const host = url.hostname.replace(/^www\./, "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["amazon.com.tr", "trendyol.com", "hepsiburada.com"].includes(host)) throw new Error("Desteklenen mağazanın ürün sayfasını açın.");
    await chrome.tabs.create({ url: `${APP_ORIGIN}/?url=${encodeURIComponent(url.href)}` });
    window.close();
  } catch (e) { document.getElementById("error").textContent = e.message; }
});
