"use client";
import { memo, useState, type FormEvent, type ReactNode } from "react";
export async function api(path: string, body?: unknown) {
  const res = await fetch(
    `/api/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
export function ActionForm({
  children,
  onSubmit,
  label = "Kaydet",
  className = "",
  buttonClass = "button",
}: {
  children?: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  label?: string;
  className?: string;
  buttonClass?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={className}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await onSubmit(new FormData(e.currentTarget));
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <p role="alert" className="error">
        {error}
      </p>
      <button disabled={busy} className={buttonClass}>
        {busy ? "İşleniyor…" : label}
      </button>
    </form>
  );
}
export const Field = memo(function Field({
  name,
  label,
  type = "text",
  ...props
}: {
  name: string;
  label: string;
  type?: string;
  [key: string]: unknown;
}) {
  return (
    <label className="field">
      {label}
      <input name={name} type={type} {...props} />
    </label>
  );
});
const liraFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const usdcFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 7 });

export function money(v: string | undefined | null, unit = "₺") {
  return v
    ? `${(unit === "USDC" ? usdcFormat : liraFormat).format(Number(v))} ${unit}`
    : "—";
}
