"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bag } from "@phosphor-icons/react";
import WalletControl from "./wallet-control";
import { useCart } from "./cart-state";

const NAV = [
  { href: "/", label: "Shop" },
  { href: "/travel", label: "Travel" },
  { href: "/hotels", label: "Hotels" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const immersive = path === "/" || path === "/travel" || path === "/hotels";
  const { count, setOpen } = useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("product-url");
        if (input instanceof HTMLInputElement) input.focus();
        else router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  function jump() {
    const input = document.getElementById("product-url");
    if (input instanceof HTMLInputElement) {
      input.focus();
      return;
    }
    router.push("/");
  }

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="LUM3ND shop">
          <img src="/LUM3NDIcon.svg" width={22} height={22} alt="" />
          <img src="/LUM3ND.svg" width={102} height={16} alt="LUM3ND" />
        </Link>
        <nav className="mode-nav" aria-label="Ana gezinme">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
              className={path === item.href ? "active" : undefined}
            >
              {item.label}
              <NavigationPending />
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="jump"
            type="button"
            onClick={jump}
            title="Open search"
          >
            Jump to <kbd>⌘K</kbd>
          </button>
          <WalletControl />
          {path === "/" ? (
            <button
              className="bag-link"
              type="button"
              aria-label="Sepet"
              onClick={() => setOpen(true)}
            >
              <Bag size={20} weight="fill" />
              {count > 0 ? <i>{count}</i> : null}
            </button>
          ) : (
            <Link href="/orders" className="bag-link" aria-label="Siparişler">
              <Bag size={20} weight="fill" />
            </Link>
          )}
        </div>
      </header>
      <main id="main">{children}</main>
      {immersive ? null : (
        <footer className="site-footer">
          <div className="footer-brand">
            <Link href="/" className="brand footer-logo">
              <img src="/LUM3NDIcon.svg" width={18} height={18} alt="" />
              <img src="/LUM3ND.svg" width={90} height={14} alt="LUM3ND" />
            </Link>
            <p>
              Türkiye'de alışveriş ve seyahati tek ödeme akışında birleştir.
            </p>
          </div>
          <div className="footer-column">
            <strong>Keşfet</strong>
            <Link href="/">Shop</Link>
            <Link href="/travel">Travel</Link>
            <Link href="/hotels">Hotels</Link>
          </div>
          <div className="footer-column">
            <strong>Hesap</strong>
            <Link href="/orders">Siparişlerim</Link>
            <Link href="/login">Giriş yap</Link>
            <Link href="/login?role=admin">Operatör girişi</Link>
          </div>
          <div className="footer-column footer-note">
            <strong>Ödeme notu</strong>
            <p>
              Stellar'da ödeme. Satın alma ve rezervasyon sağlayıcı sitesinde
              tamamlanır.
            </p>
          </div>
        </footer>
      )}
    </>
  );
}

function NavigationPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`nav-pending${pending ? " is-pending" : ""}`}
    />
  );
}
