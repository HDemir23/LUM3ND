"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isConnected, requestAccess, signMessage } from "@stellar/freighter-api";
import { ArrowLeft, ArrowUpRight, Check, ShieldCheck, Wallet } from "@phosphor-icons/react";
import { connectWallet, loginDestination, type ConnectionStep } from "@/lib/wallet-connection";
import { useCart } from "./cart-state";
import { ActionForm, Field, api } from "./ui";

export default function Login({ role }: { role: "user" | "admin" }) {
  return role === "admin" ? <AdminLogin /> : <WalletLogin />;
}
function AdminLogin() {
  const router = useRouter();
  return <section className="page-shell narrow panel">
    <div className="eyebrow">LUM3ND · OPERASYON</div><h1>Yönetici girişi</h1>
    <p className="muted">Teklifleri ve sipariş sürecini yönet.</p>
    <ActionForm className="login-form" label="Giriş yap →" onSubmit={async d => {
      await api("auth/login", { role: "admin", password: d.get("password") });
      router.push("/admin"); router.refresh();
    }}><Field label="Parola" name="password" type="password" required autoComplete="current-password" /></ActionForm>
  </section>;
}
function WalletLogin() {
  const router = useRouter();
  const { wallet, reload, sessionLoading } = useCart();
  const [availability, setAvailability] = useState<"checking" | "ready" | "missing">("checking");
  const [step, setStep] = useState<ConnectionStep | "idle" | "done">("idle");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const active = useRef(false);
  const mounted = useRef(true);
  const attempt = useRef<AbortController | null>(null);
  const busy = ["connecting", "signing", "verifying"].includes(step);
  const destination = () => loginDestination(new URLSearchParams(window.location.search).get("next"));
  const detect = useCallback(async () => {
    setAvailability("checking");
    try {
      const result = await isConnected();
      if (mounted.current) setAvailability(result.isConnected ? "ready" : "missing");
    } catch {
      if (mounted.current) setAvailability("missing");
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void detect();
    const recheck = () => { if (!active.current) void detect(); };
    window.addEventListener("focus", recheck);
    return () => {
      mounted.current = false;
      attempt.current?.abort();
      window.removeEventListener("focus", recheck);
    };
  }, [detect]);
  async function connect() {
    if (active.current) return;
    active.current = true;
    attempt.current = new AbortController();
    setError("");
    try {
      await connectWallet({ requestAccess, signMessage }, api, (nextStep, nextAddress) => {
        if (!mounted.current) return;
        setStep(nextStep);
        if (nextAddress) setAddress(nextAddress);
      }, attempt.current.signal);
      if (!mounted.current) return;
      setStep("done");
      await reload();
      router.replace(destination());
      router.refresh();
    } catch (e) {
      if (mounted.current) {
        setStep("idle");
        setError(e instanceof Error ? e.message : "Bağlantı tamamlanamadı. Tekrar dene.");
      }
    } finally { active.current = false; }
  }
  const labels = { idle: error ? "Tekrar dene" : "Freighter ile bağlan", connecting: "Freighter’da bağlantıyı onayla…", signing: "Giriş mesajını imzala…", verifying: "İmza doğrulanıyor…", done: "Bağlandı, yönlendiriliyorsun…" };
  return <section className="page-shell narrow panel wallet-login">
    <Link href="/" className="wallet-back"><ArrowLeft size={16} /> Alışverişe dön</Link>
    <div className="wallet-emblem"><Wallet size={28} weight="duotone" /></div>
    <div className="eyebrow">LUM3ND · CÜZDAN BAĞLANTISI</div>
    <h1>{wallet && !busy ? "Cüzdanın bağlı." : "Bağlan. Alışverişe devam et."}</h1>
    <p className="muted">Sepetini kaydet, siparişlerini takip et ve hazır olduğunda USDC ile öde.</p>
    {wallet && !busy ? <>
      <div className="wallet-provider"><Check size={22} /><div><strong>Freighter</strong><code>{wallet.slice(0, 8)}…{wallet.slice(-8)}</code></div><span className="wallet-status">Bağlı</span></div>
      <button className="mint-btn mint-btn-block" onClick={() => router.replace(destination())}>Devam et →</button>
    </> : <>
      <div className="wallet-provider"><Wallet size={24} weight="duotone" /><div><strong>Freighter</strong><span>Stellar cüzdanı</span></div><span className="wallet-status">{availability === "ready" ? "Hazır" : "Bağlantı bekliyor"}</span></div>
      <>
        <ol className="wallet-steps" aria-label="Bağlantı adımları">
          <li className={step === "connecting" ? "current" : step !== "idle" ? "complete" : ""}><span>{["signing", "verifying", "done"].includes(step) ? <Check size={15} /> : "1"}</span><div><strong>Cüzdanını bağla</strong><p>Freighter’da LUM3ND’ye erişim izni ver.</p></div></li>
          <li className={["signing", "verifying"].includes(step) ? "current" : step === "done" ? "complete" : ""}><span>{step === "done" ? <Check size={15} /> : "2"}</span><div><strong>Girişini onayla</strong><p>Yalnızca cüzdanın sana ait olduğunu doğrulayan mesajı imzala.</p></div></li>
        </ol>
        {address && busy && <code className="wallet-address">{address.slice(0, 8)}…{address.slice(-8)}</code>}
        <button className="mint-btn mint-btn-block wallet-connect-button" disabled={busy || step === "done" || sessionLoading} onClick={connect}>
          {sessionLoading ? "Oturum kontrol ediliyor…" : labels[step]}
        </button>
        <p role="status" className="wallet-progress">{busy ? "Freighter penceresi görünmüyorsa tarayıcındaki eklentiyi aç." : ""}</p>
      </>
      {availability === "missing" && !busy && <div className="wallet-install wallet-detection-help">
        <p>Freighter yüklüyse yukarıdan bağlanmayı dene. Eklentiyi aç, kilidini kaldır ve bu siteye erişim iznini kontrol et.</p>
        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">Freighter’ım yok <ArrowUpRight size={14} /></a>
      </div>}
    </>}
    {error && <p role="alert" className="wallet-error">{error}</p>}
    <p className="wallet-assurance"><ShieldCheck size={18} /><span>Giriş ücretsizdir. Bu adımda para gönderilmez.</span></p>
  </section>;
}
