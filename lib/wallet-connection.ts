export type ConnectionStep = "connecting" | "signing" | "verifying";
export type WalletBridge = {
  requestAccess: () => Promise<{ address: string; error?: unknown }>;
  signMessage: (message: string, options: { address: string }) => Promise<{
    signedMessage: string | Uint8Array | null;
    signerAddress: string;
    error?: unknown;
  }>;
};

export function loginDestination(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  const url = new URL(value, "https://lum3nd.local");
  if (url.origin !== "https://lum3nd.local" || !/^\/(?:orders(?:\/[^/]+)?|travel|hotels)?$/.test(url.pathname)) return "/";
  return url.pathname + url.search + url.hash;
}

export async function connectWallet(
  bridge: WalletBridge,
  api: (path: string, body: Record<string, unknown>) => Promise<any>,
  onStep: (step: ConnectionStep, address?: string) => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  onStep("connecting");
  const access = await bridge.requestAccess();
  signal?.throwIfAborted();
  if (access.error || !access.address)
    throw new Error("Bağlantı onaylanmadı. Freighter’ın yüklü olduğu tarayıcıda bu sayfayı aç, cüzdan kilidini kaldır ve eklentinin bu siteye erişimine izin ver. Ardından tekrar dene.");
  const challenge = await api("auth/challenge", { wallet: access.address });
  signal?.throwIfAborted();
  onStep("signing", access.address);
  const signed = await bridge.signMessage(challenge.message, { address: access.address });
  signal?.throwIfAborted();
  if (signed.signerAddress && signed.signerAddress !== access.address)
    throw new Error("İşlem sırasında cüzdan değişti. Seçtiğin cüzdanla yeniden bağlan.");
  if (signed.error || !signed.signedMessage || signed.signerAddress !== access.address)
    throw new Error("Giriş imzası onaylanmadı. Hiçbir ödeme yapılmadı; tekrar deneyebilirsin.");
  const signature = typeof signed.signedMessage === "string"
    ? signed.signedMessage
    : btoa(String.fromCharCode(...signed.signedMessage));
  onStep("verifying", access.address);
  await api("auth/verify", { id: challenge.id, signature });
  return access.address;
}
