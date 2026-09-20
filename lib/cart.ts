import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { addressInput, AppError, orderInput } from "./domain";
import { lookupProduct } from "./products";
export const getCart = (wallet: string) =>
  db.cartItem.findMany({ where: { wallet }, orderBy: { id: "asc" } });
export async function addCart(wallet: string, body: unknown) {
  const data = orderInput.parse(body);
  // Prices always come from the server, never from client-submitted metadata.
  const { manualQuote } = z.object({ manualQuote: z.boolean().default(false) }).parse(body);
  const product = data.merchant === "AMAZON" && !manualQuote ? await lookupProduct(data.url) : null;
  const details = product ? {
    title: product.title, imageUrl: product.imageUrl, unitTry: product.unitTry,
    productUsd: product.productUsd, unitUsd: product.unitUsd, rate: product.rate,
    rateDate: product.rateDate, fetchedAt: product.fetchedAt,
  } : {};
  if (product) data.url = product.url;
  await db.$transaction(async (tx) => {
    const old = await tx.cartItem.findUnique({
      where: { wallet_url_notes: { wallet, url: data.url, notes: data.notes } },
    });
    if ((old?.quantity ?? 0) + data.quantity > 20)
      throw new AppError("Bir ürün için en fazla 20 adet ekleyebilirsiniz.");
    if (!old && (await tx.cartItem.count({ where: { wallet } })) >= 100)
      throw new AppError("Sepet en fazla 100 ürün içerebilir.");
    await tx.cartItem.upsert({
      where: { wallet_url_notes: { wallet, url: data.url, notes: data.notes } },
      create: { ...data, ...details, wallet },
      update: { ...details, quantity: { increment: data.quantity } },
    });
  });
  return getCart(wallet);
}
export async function changeCart(wallet: string, id: string, body: unknown) {
  const { quantity } = z
    .object({ quantity: z.number().int().min(0).max(20) })
    .parse(body);
  const result =
    quantity === 0
      ? await db.cartItem.deleteMany({ where: { id, wallet } })
      : await db.cartItem.updateMany({
          where: { id, wallet },
          data: { quantity },
        });
  if (!result.count) throw new AppError("Ürün bulunamadı.", 404);
  return getCart(wallet);
}
export async function checkout(wallet: string, body: unknown) {
  const input = z
    .object({ key: z.string().uuid(), address: addressInput })
    .parse(body);
  const checkoutKey = `${wallet}:${input.key}`;
  return db.$transaction(async (tx) => {
    const old = await tx.order.findUnique({ where: { checkoutKey } });
    if (old) return old;
    const items = await tx.cartItem.findMany({ where: { wallet } });
    if (!items.length) throw new AppError("Sepet boş.");
    const order = await tx.order.create({
      data: {
        wallet,
        checkoutKey,
        memo: randomBytes(12).toString("hex"),
        url: items[0].url,
        merchant: items[0].merchant,
        quantity: items.reduce((n, x) => n + x.quantity, 0),
        notes: "",
        serviceUsdc: String(items.reduce((n, x) => n + x.quantity, 0)),
        rate: items.find((item) => item.rate)?.rate,
        items: {
          create: items.map(({ url, merchant, quantity, notes, title, imageUrl, unitTry }) => ({
            url,
            merchant,
            quantity,
            notes,
            title,
            imageUrl,
            unitTry,
          })),
        },
        stores: {
          create: [...new Set(items.map((x) => x.merchant))].map(
            (merchant) => ({ merchant }),
          ),
        },
        address: { create: input.address },
      },
    });
    await tx.cartItem.deleteMany({ where: { wallet } });
    return order;
  });
}
