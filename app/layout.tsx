import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/components/cart-state";
import Shell from "@/components/shell";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LUM3ND - Shop with Stablecoins",
  description: "Paste any product URL and pay with Stellar USDC. No KYC required.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={geist.className}>
      <body>
        <a href="#main" className="skip">
          İçeriğe geç
        </a>
        {process.env.STELLAR_NETWORK === "testnet" && (
          <div className="testnet-banner" role="status">TESTNET · Test tokenlarıyla demo. Gerçek ödeme ve mağaza siparişi yapılmaz.</div>
        )}
        <CartProvider>
          <Shell>{children}</Shell>
        </CartProvider>
      </body>
    </html>
  );
}
