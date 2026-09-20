"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Copy, SignOut, Wallet } from "@phosphor-icons/react";
import { useCart } from "./cart-state";
import { api } from "./ui";

export default function WalletControl() {
  const { wallet, sessionLoading, reload } = useCart();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); setCopied(false); setError(""); }, [path, wallet]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (sessionLoading) return <button className="connect" disabled aria-label="Oturum kontrol ediliyor"><Wallet size={16} /> Bağlanıyor…</button>;
  if (!wallet) return <Link href={`/login?next=${encodeURIComponent(path === "/login" ? "/" : path)}`} className="connect" aria-label="Cüzdan bağla" onClick={event => {
    const product = document.getElementById("product-url");
    if (product instanceof HTMLInputElement && product.value) {
      event.preventDefault();
      router.push(`/login?next=${encodeURIComponent(`/?url=${encodeURIComponent(product.value)}`)}`);
    }
  }}><Wallet size={16} weight="fill" /> Connect wallet</Link>;
  return <div className="wallet-control" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="connect connected" type="button" aria-label={`Bağlı cüzdan ${wallet.slice(0, 4)}…${wallet.slice(-4)}`} aria-expanded={open} aria-controls="wallet-account" onClick={() => setOpen(!open)}>
      <Wallet size={16} weight="fill" /> {wallet.slice(0, 4)}…{wallet.slice(-4)}
    </button>
    {open && <div className="wallet-popover" id="wallet-account">
      <span className="eyebrow">BAĞLI CÜZDAN</span>
      <code>{wallet.slice(0, 10)}…{wallet.slice(-10)}</code>
      <Link href="/orders">Siparişlerim <span>→</span></Link>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(wallet); setCopied(true); setError(""); }
        catch { setError("Adres kopyalanamadı. Tarayıcı izinlerini kontrol et."); }
      }}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Adres kopyalandı" : "Adresi kopyala"}</button>
      <button type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await api("auth/logout", { role: "user" }); await reload(); setOpen(false); router.push("/"); router.refresh(); }
        catch { setError("Oturum kapatılamadı. Tekrar dene."); }
        finally { setBusy(false); }
      }}><SignOut size={16} /> {busy ? "Bağlantı kesiliyor…" : "Bağlantıyı kes"}</button>
      <span role="status" className="small muted">{copied ? "Cüzdan adresi panoya kopyalandı." : ""}</span>
      {error && <p role="alert" className="error">{error}</p>}
    </div>}
  </div>;
}
