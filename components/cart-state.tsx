"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { api } from "./ui";
export type CartItem = {
  id: string;
  url: string;
  merchant: string;
  quantity: number;
  notes: string;
  title?: string | null;
  imageUrl?: string | null;
  unitTry?: string | null;
  productUsd?: string | null;
  unitUsd?: string | null;
  rate?: string | null;
  rateDate?: string | null;
  fetchedAt?: string | null;
};
type CartState = {
  open: boolean;
  setOpen: (v: boolean) => void;
  items: CartItem[];
  count: number;
  wallet: string | null;
  sessionLoading: boolean;
  reload: () => Promise<void>;
};
const CartContext = createContext<CartState | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const path = usePathname();
  const requestVersion = useRef(0);
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const session = await api("auth/session");
      const nextItems: CartItem[] = session.wallet ? await api("cart") : [];
      if (version !== requestVersion.current) return;
      setWallet(session.wallet);
      setItems((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextItems)
          ? previous
          : nextItems,
      );
    } catch {
      if (version !== requestVersion.current) return;
      setItems([]);
      setWallet(null);
    } finally {
      if (version === requestVersion.current) setSessionLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload, path]);
  useEffect(() => {
    let active = true;
    if (!wallet) return;
    let stop: (() => void) | undefined;
    void import("@stellar/freighter-api")
      .then(({ WatchWalletChanges }) => {
        if (!active) return;
        const watcher = new WatchWalletChanges(3000);
        stop = () => watcher.stop();
        watcher.watch(async ({ address }) => {
          if (address && address !== wallet && active) {
            active = false;
            watcher.stop();
            ++requestVersion.current;
            setItems([]);
            setWallet(null);
            try {
              await api("auth/logout", { role: "user" });
            } finally {
              window.location.assign("/login");
            }
          }
        });
      })
      .catch(() => {});
    return () => {
      active = false;
      stop?.();
    };
  }, [wallet]);
  const value = useMemo(
    () => ({
      open,
      setOpen,
      items,
      wallet,
      sessionLoading,
      count: items.reduce((n, item) => n + item.quantity, 0),
      reload,
    }),
    [open, items, wallet, sessionLoading, reload],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("CartProvider missing");
  return ctx;
}
export function productTitle(url: string) {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    const slug = path.find(
      (part) =>
        part !== "dp" &&
        part !== "gp" &&
        part !== "product" &&
        !/^B0[A-Z0-9]{8}$/i.test(part) &&
        !/^HBC/i.test(part) &&
        !/^\d+$/.test(part),
    );
    return decodeURIComponent(slug || "Ürün")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  } catch {
    return "Ürün bağlantısı";
  }
}
