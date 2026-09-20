import { randomBytes } from "node:crypto";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { db } from "./db";
import {
  AppError,
  assertTransition,
  calculateQuote,
  calculateBasketQuote,
  basketQuoteInput,
  orderInput,
  quoteInput,
} from "./domain";
import {
  buildPayment,
  horizon,
  networkConfig,
  orderConfig,
  validateChainPayment,
} from "./stellar";
export async function getOrder(id: string, wallet?: string) {
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      address: true,
      stores: true,
      attempts: {
        orderBy: { createdAt: "desc" },
        select: { hash: true, state: true, maxTime: true, payer: true },
      },
    },
  });
  if (!o || (wallet !== undefined && o.wallet !== wallet))
    throw new AppError("Sipariş bulunamadı.", 404);
  return o;
}
export async function createOrder(body: unknown) {
  const data = orderInput.parse(body);
  return db.order.create({
    data: { ...data, memo: randomBytes(12).toString("hex") },
  });
}
export async function quoteOrder(id: string, body: unknown) {
  const before = await getOrder(id);
  const input = before.items.length
    ? basketQuoteInput.parse(body)
    : quoteInput.parse(body);
  const c = networkConfig();
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { attempts: true },
    });
    if (
      !["REQUESTED", "QUOTED"].includes(o.status) ||
      o.attempts.some((a) => a.state === "PENDING")
    )
      throw new AppError(
        "Aktif ödeme varken teklif değiştirilemez. Önce ödeme durumunu sorgulayın.",
      );
    let totals;
    let title;
    if ("items" in input) {
      if (
        input.items.length !== before.items.length ||
        new Set(input.items.map((x) => x.id)).size !== before.items.length ||
        input.items.some((x) => !before.items.some((y) => y.id === x.id)) ||
        input.stores.length !== before.stores.length ||
        new Set(input.stores.map((x) => x.merchant)).size !==
          before.stores.length ||
        input.stores.some(
          (x) => !before.stores.some((y) => y.merchant === x.merchant),
        )
      )
        throw new AppError(
          "Teklif tüm ürünleri ve mağazaları tam olarak içermeli.",
        );
      totals = calculateBasketQuote(input, before.items);
      title = input.items
        .map((x) => x.title)
        .join(", ")
        .slice(0, 200);
      for (const item of input.items)
        await tx.orderItem.update({
          where: { id: item.id },
          data: { title: item.title, unitTry: item.unitTry },
        });
      for (const store of input.stores)
        await tx.merchantOrder.update({
          where: {
            orderId_merchant: { orderId: id, merchant: store.merchant },
          },
          data: { shippingTry: store.shippingTry },
        });
    } else {
      totals = calculateQuote(input, o.quantity);
      title = input.title;
    }
    return tx.order.update({
      where: { id },
      data: {
        ...totals,
        title,
        quoteVersion: { increment: 1 },
        status: "QUOTED",
        expiresAt: new Date(Date.now() + 900000),
        network: c.network,
        issuer: c.issuer,
        receiver: c.receiver,
      },
    });
  });
}
export async function preparePayment(id: string, payer: string) {
  const o = await getOrder(id);
  if (o.wallet && o.wallet !== payer)
    throw new AppError("Cüzdan değişti. Yeniden giriş yapın.", 403);
  if (o.status !== "QUOTED") throw new AppError("Sipariş ödeme beklemiyor.");
  const previous = await db.attempt.findFirst({
    where: { orderId: id, state: "PENDING" },
  });
  if (previous) {
    if (previous.payer !== payer)
      throw new AppError(
        "Bu sipariş için başka cüzdanla hazırlanmış ödeme var. Durumunu sorgulayın.",
      );
    if (previous.maxTime <= Date.now() / 1000)
      throw new AppError("Önce mevcut işlemin durumunu sorgulayın.");
    return { ...previous, passphrase: orderConfig(o).passphrase };
  }
  if (!o.expiresAt || o.expiresAt.getTime() <= Date.now())
    throw new AppError(
      "Teklif süresi doldu. Yönetici yeni teklif oluşturmalı.",
    );
  const built = await buildPayment(o, payer);
  const attempt = await db.$transaction(async (tx) => {
    const fresh = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { attempts: true },
    });
    if (fresh.quoteVersion !== o.quoteVersion || fresh.status !== "QUOTED")
      throw new AppError("Teklif değişti. Sayfayı yenileyin.", 409);
    const pending = fresh.attempts.find((a) => a.state === "PENDING");
    if (pending)
      throw new AppError("İşlem zaten hazırlanıyor. Durumunu sorgulayın.", 409);
    return tx.attempt.create({ data: { ...built, orderId: id } });
  });
  return { ...attempt, passphrase: orderConfig(o).passphrase };
}
function is404(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "response" in e &&
    (e as { response: { status: number } }).response?.status === 404
  );
}
export async function verifyPayment(id: string) {
  const o = await getOrder(id);
  if (o.paidHash) return { state: "PAID", order: o };
  const attempt = await db.attempt.findFirst({
    where: { orderId: id, state: "PENDING" },
  });
  if (!attempt) return { state: "NONE", order: o };
  const c = orderConfig(o);
  const server = horizon(c.network);
  let record;
  try {
    record = await server.transactions().transaction(attempt.hash).call();
  } catch (e) {
    if (!is404(e))
      throw new AppError(
        "Ağ yanıtı gecikiyor. Tekrar ödeme yapmadan mevcut işlemi sorgulayın.",
        503,
      );
    if (Date.now() / 1000 > attempt.maxTime + 60) {
      const ledgers = await server.ledgers().order("desc").limit(1).call();
      if (
        new Date(ledgers.records[0].closed_at).getTime() / 1000 >
        attempt.maxTime + 60
      ) {
        try {
          await server.transactions().transaction(attempt.hash).call();
          return verifyPayment(id);
        } catch (again) {
          if (!is404(again))
            throw new AppError(
              "Ağ doğrulaması tamamlanamadı. Mevcut işlemi tekrar sorgulayın.",
              503,
            );
        }
        await db.attempt.updateMany({
          where: { id: attempt.id, state: "PENDING" },
          data: { state: "EXPIRED" },
        });
        return { state: "EXPIRED", order: await getOrder(id) };
      }
    }
    return { state: "PENDING", order: o };
  }
  if (!record.successful) {
    await db.attempt.update({
      where: { id: attempt.id },
      data: { state: "FAILED" },
    });
    return { state: "FAILED", order: await getOrder(id) };
  }
  validateChainPayment(record, {
    hash: attempt.hash,
    source: attempt.payer,
    destination: o.receiver!,
    issuer: o.issuer!,
    amount: o.totalUsdc!,
    memo: o.memo,
    passphrase: c.passphrase,
    latest: attempt.maxTime,
  });
  await db.$transaction(async (tx) => {
    const fresh = await tx.order.findUniqueOrThrow({ where: { id } });
    if (fresh.paidHash === attempt.hash) return;
    if (fresh.status !== "QUOTED")
      throw new AppError("Sipariş durumu ödeme ile çakışıyor.", 409);
    await tx.order.update({
      where: { id },
      data: {
        status: "PAID",
        payer: attempt.payer,
        paidHash: attempt.hash,
        paidAt: new Date(record.created_at),
      },
    });
    await tx.attempt.update({
      where: { id: attempt.id },
      data: { state: "CONFIRMED" },
    });
  });
  return { state: "PAID", order: await getOrder(id) };
}
export async function submitPayment(id: string, signedXdr: string) {
  const o = await getOrder(id);
  if (o.paidHash) return { state: "PAID", order: o };
  const a = await db.attempt.findFirst({
    where: { orderId: id, state: "PENDING" },
  });
  if (!a) throw new AppError("Hazırlanmış işlem bulunamadı.");
  const c = orderConfig(o);
  const tx = TransactionBuilder.fromXDR(signedXdr, c.passphrase);
  if (
    !(tx instanceof Transaction) ||
    Buffer.from(tx.hash()).toString("hex") !== a.hash ||
    tx.signatures.length === 0
  )
    throw new AppError("İmzalı işlem hazırlanan ödeme ile eşleşmiyor.");
  await db.attempt.update({ where: { id: a.id }, data: { signedXdr } });
  try {
    await horizon(c.network).submitTransaction(tx);
  } catch {
    /* A timeout or submission error is not proof that the payment failed. Reconcile the immutable hash. */
  }
  return verifyPayment(id);
}
export async function updateStatus(
  id: string,
  body: { status: string; purchaseRef?: string; shippingInfo?: string },
) {
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { attempts: true, stores: true },
    });
    if (o.stores.length && ["PURCHASED", "SHIPPED"].includes(body.status))
      throw new AppError("Her mağazayı ayrı kaydedin.");
    assertTransition(o.status, body.status);
    if (o.attempts.some((a) => a.state === "PENDING"))
      throw new AppError("Ödeme sonucu belirsizken sipariş değiştirilemez.");
    if (body.status === "PURCHASED" && !body.purchaseRef?.trim())
      throw new AppError("Mağaza sipariş referansı gerekli.");
    if (body.status === "SHIPPED" && !body.shippingInfo?.trim())
      throw new AppError("Kargo bilgisi gerekli.");
    return tx.order.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === "PURCHASED"
          ? { purchaseRef: body.purchaseRef!.trim() }
          : {}),
        ...(body.status === "SHIPPED"
          ? { shippingInfo: body.shippingInfo!.trim() }
          : {}),
      },
    });
  });
}
export async function verifyRefund(id: string, hash: string) {
  const o = await getOrder(id);
  if (o.status === "REFUNDED" && o.refundHash === hash) return o;
  if (o.status !== "REFUND_PENDING")
    throw new AppError("Sipariş iade beklemiyor.");
  const c = orderConfig(o);
  let record;
  try {
    record = await horizon(c.network).transactions().transaction(hash).call();
  } catch {
    throw new AppError(
      "İade işlemi ağda bulunamadı. Daha sonra tekrar sorgulayın.",
    );
  }
  validateChainPayment(record, {
    hash,
    source: o.receiver!,
    destination: o.payer!,
    issuer: o.issuer!,
    amount: o.totalUsdc!,
    memo: `R${o.memo}`,
    passphrase: c.passphrase,
    earliest: o.paidAt!.getTime() / 1000,
  });
  return db.order.update({
    where: { id, status: "REFUND_PENDING" },
    data: { status: "REFUNDED", refundHash: hash },
  });
}

export async function fulfillStore(
  id: string,
  merchant: string,
  body: { purchaseRef?: string; shippingInfo?: string },
) {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { stores: true },
    });
    if (
      !o.paidHash ||
      ![
        "PAID",
        "PARTIALLY_PURCHASED",
        "PURCHASED",
        "PARTIALLY_SHIPPED",
        "SHIPPED",
      ].includes(o.status)
    )
      throw new AppError(
        "Önce ödeme doğrulanmalı; iade sürecinde değişiklik yapılamaz.",
      );
    const store = o.stores.find((x) => x.merchant === merchant);
    if (!store) throw new AppError("Mağaza bulunamadı.", 404);
    if (!body.purchaseRef?.trim() && !store.purchaseRef)
      throw new AppError("Satın alma referansı gerekli.");
    await tx.merchantOrder.update({
      where: { id: store.id },
      data: {
        ...(body.purchaseRef?.trim()
          ? { purchaseRef: body.purchaseRef.trim() }
          : {}),
        ...(body.shippingInfo?.trim()
          ? { shippingInfo: body.shippingInfo.trim() }
          : {}),
      },
    });
    const stores = await tx.merchantOrder.findMany({ where: { orderId: id } });
    const bought = stores.filter((x) => x.purchaseRef).length,
      shipped = stores.filter((x) => x.shippingInfo).length;
    const status =
      shipped === stores.length
        ? "SHIPPED"
        : shipped
          ? "PARTIALLY_SHIPPED"
          : bought === stores.length
            ? "PURCHASED"
            : "PARTIALLY_PURCHASED";
    await tx.order.update({ where: { id }, data: { status } });
  });
  return getOrder(id);
}
