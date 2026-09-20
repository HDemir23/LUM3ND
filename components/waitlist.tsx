"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "@phosphor-icons/react";

export default function Waitlist({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    router.push("/login");
  }

  return (
    <section className="glass-card glass-card-section waitlist-card">
      <div className="waitlist-icon">{icon}</div>
      <p className="waitlist-kicker">Early access</p>
      <h1>{title}</h1>
      <p className="waitlist-copy">{subtitle}</p>
      <form className="waitlist-form" onSubmit={onSubmit}>
        <div className="waitlist-grid">
          <label>
            <span>Name</span>
            <input
              name="name"
              autoComplete="name"
              maxLength={100}
              placeholder="Your name"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
        </div>
        <div className="wallet-hint">
          <Wallet size={16} />
          <span>Connect your wallet to join</span>
        </div>
        <button className="mint-btn mint-btn-block" disabled={busy} type="submit">
          {busy ? "Opening…" : "Connect wallet"}
        </button>
      </form>
    </section>
  );
}
