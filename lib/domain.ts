import Decimal from "decimal.js";
import { z } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const merchants: Record<string, string> = {
  AMAZON: "Amazon Türkiye",
  TRENDYOL: "Trendyol",
  HEPSIBURADA: "Hepsiburada",
};
export function parseProductUrl(value: string) {
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^www\./, "");
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      throw Error();
    let merchant: string;
    if (
      host === "amazon.com.tr" &&
      /\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i.test(u.pathname)
    )
      merchant = "AMAZON";
    else if (host === "trendyol.com" && /-p-\d+(?:\/|$)/i.test(u.pathname))
      merchant = "TRENDYOL";
    else if (
      host === "hepsiburada.com" &&
      /-pm?-[a-z0-9]+(?:\/|$)/i.test(u.pathname)
    )
      merchant = "HEPSIBURADA";
    else throw Error();
    u.search = "";
    u.hash = "";
    return { url: u.toString(), merchant };
  } catch {
    throw new AppError(
      "Amazon Türkiye, Trendyol veya Hepsiburada’dan tam ürün bağlantısı girin. Kısaltılmış linkler desteklenmiyor.",
    );
  }
}
export const orderInput = z
  .object({
    url: z.string().max(2048),
    quantity: z.number().int().min(1).max(20),
    notes: z.string().trim().max(500).default(""),
  })
  .transform((data, ctx) => {
    try {
      return { ...data, ...parseProductUrl(data.url) };
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
      return z.NEVER;
    }
  });

const money = z
  .string()
  .regex(
    /^\d{1,7}(\.\d{1,4})?$/,
    "Pozitif bir tutar girin; ondalık ayırıcı olarak nokta kullanın.",
  );
export const quoteInput = z.object({
  title: z.string().trim().min(2).max(200),
  productTry: money.refine(
    (v) => new Decimal(v).decimalPlaces() <= 2,
    "TRY tutarları en fazla 2 ondalık basamak içermeli.",
  ),
  shippingTry: money.refine(
    (v) => new Decimal(v).decimalPlaces() <= 2,
    "TRY tutarları en fazla 2 ondalık basamak içermeli.",
  ),
  rate: money,
  serviceUsdc: money.optional(),
});
export function calculateQuote(
  input: z.infer<typeof quoteInput>,
  quantity: number,
) {
  const product = new Decimal(input.productTry).mul(quantity);
  const shipping = new Decimal(input.shippingTry);
  const rate = new Decimal(input.rate);
  if (product.lte(0) || rate.lte(0))
    throw new AppError("Ürün bedeli ve kur sıfırdan büyük olmalı.");
  const service = new Decimal(input.serviceUsdc ?? String(quantity));
  const total = product
    .plus(shipping)
    .div(rate)
    .plus(service)
    .toDecimalPlaces(7, Decimal.ROUND_UP);
  if (total.lte(0)) throw new AppError("Geçersiz toplam.");
  return {
    productTry: product.toFixed(2),
    shippingTry: shipping.toFixed(2),
    rate: rate.toFixed(4),
    commissionTry: "0.00",
    serviceUsdc: service.toFixed(4),
    totalUsdc: total.toFixed(7),
  };
}
export const labels: Record<string, string> = {
  REQUESTED: "Teklif bekliyor",
  QUOTED: "Ödeme bekliyor",
  PAID: "Ödendi",
  PARTIALLY_PURCHASED: "Kısmen satın alındı",
  PARTIALLY_SHIPPED: "Kısmen kargolandı",
  PURCHASED: "Satın alındı",
  SHIPPED: "Kargolandı",
  CANCELLED: "İptal edildi",
  REFUND_PENDING: "İade bekliyor",
  REFUNDED: "İade edildi",
};
export function assertTransition(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    REQUESTED: ["CANCELLED"],
    QUOTED: ["CANCELLED"],
    PAID: ["PURCHASED", "REFUND_PENDING"],
    PURCHASED: ["SHIPPED", "REFUND_PENDING"],
    SHIPPED: ["REFUND_PENDING"],
    PARTIALLY_PURCHASED: ["REFUND_PENDING"],
    PARTIALLY_SHIPPED: ["REFUND_PENDING"],
  };
  if (!allowed[from]?.includes(to))
    throw new AppError("Bu durum geçişine izin verilmiyor.");
}

export const addressInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{10,20}$/, "Geçerli telefon girin."),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(500),
  postalCode: z.string().regex(/^\d{5}$/, "Posta kodu 5 haneli olmalı."),
});
export const basketQuoteInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().trim().min(2).max(200),
        unitTry: money.refine(
          (v) => new Decimal(v).gt(0) && new Decimal(v).decimalPlaces() <= 2,
        ),
      }),
    )
    .min(1)
    .max(100),
  stores: z
    .array(
      z.object({
        merchant: z.string(),
        shippingTry: money.refine((v) => new Decimal(v).decimalPlaces() <= 2),
      }),
    )
    .min(1)
    .max(3),
  rate: money.refine((v) => new Decimal(v).gt(0)),
  serviceUsdc: money.optional(),
});
export function calculateBasketQuote(
  input: z.infer<typeof basketQuoteInput>,
  items: { id: string; quantity: number }[],
) {
  const product = items.reduce((sum, item) => {
    const line = input.items.find((x) => x.id === item.id);
    if (!line) throw new AppError("Tüm ürün fiyatları gerekli.");
    return sum.plus(new Decimal(line.unitTry).mul(item.quantity));
  }, new Decimal(0));
  const shipping = input.stores.reduce(
    (sum, store) => sum.plus(store.shippingTry),
    new Decimal(0),
  );
  return calculateQuote(
    {
      title: "Sepet",
      productTry: product.toFixed(2),
      shippingTry: shipping.toFixed(2),
      rate: input.rate,
      serviceUsdc: String(items.reduce((sum, item) => sum + item.quantity, 0)),
    },
    1,
  );
}
