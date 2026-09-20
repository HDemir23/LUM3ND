import { challenge, consumeChallenge } from "@/lib/wallet-auth";
import { getCart, addCart, changeCart, checkout } from "@/lib/cart";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/domain";
import {
  checkOrigin,
  login,
  logout,
  requireRole,
  limitLogin,
  createSession,
  roleSession,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupProduct, limitProductLookup } from "@/lib/products";
import {
  fulfillStore,
  getOrder,
  preparePayment,
  quoteOrder,
  submitPayment,
  updateStatus,
  verifyPayment,
  verifyRefund,
} from "@/lib/orders";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const [root, id, action] = path;
    if (req.method !== "GET") checkOrigin(req);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > 30000) throw new AppError("İstek çok büyük.", 413);
      try {
        body = z.record(z.string(), z.unknown()).parse(JSON.parse(text));
      } catch {
        throw new AppError("Geçersiz JSON.");
      }
    }
    let result: unknown;
    if (root === "auth" && id === "session" && req.method === "GET") {
      const session = await roleSession("user");
      result = { wallet: session?.wallet ?? null };
    } else if (root === "auth" && req.method === "POST") {
      if (id === "challenge") {
        limitLogin("challenge");
        return NextResponse.json(
          await challenge(z.string().max(56).parse(body.wallet)),
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (id === "verify") {
        limitLogin("verify");
        const wallet = await consumeChallenge(
          z.string().max(100).parse(body.id),
          z.string().max(128).parse(body.signature),
        );
        await createSession("user", wallet);
        return NextResponse.json(
          { wallet },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const role = z.enum(["user", "admin"]).parse(body.role);
      if (id === "login") {
        limitLogin(role);
        await login(role, z.string().max(256).parse(body.password));
      } else if (id === "logout") {
        await logout(role);
      } else throw new AppError("Bulunamadı.", 404);
      result = { ok: true };
    } else if (root === "products" && !id && req.method === "POST") {
      const session = await requireRole("user");
      limitProductLookup(session.wallet!);
      result = await lookupProduct(z.string().max(2048).parse(body.url));
    } else if (root === "cart") {
      const session = await requireRole("user");
      if (req.method === "POST" && !id) limitProductLookup(session.wallet!);
      result =
        req.method === "GET"
          ? await getCart(session.wallet!)
          : id
            ? await changeCart(session.wallet!, id, body)
            : await addCart(session.wallet!, body);
    } else if (root === "orders") {
      const session = await requireRole("user");
      if (id) await getOrder(id, session.wallet!);
      if (req.method === "GET")
        result = id
          ? await getOrder(id)
          : await db.order.findMany({
              where: { wallet: session.wallet! },
              orderBy: { createdAt: "desc" },
              take: 100,
            });
      else if (!id) result = await checkout(session.wallet!, body);
      else if (action === "cancel")
        result = await updateStatus(id, { status: "CANCELLED" });
      else if (action === "prepare") {
        if (body.payer !== session.wallet)
          throw new AppError("Cüzdan değişti. Yeniden giriş yapın.", 403);
        result = await preparePayment(id, session.wallet!);
      } else if (action === "submit")
        result = await submitPayment(
          id,
          z.string().max(20000).parse(body.signedXdr),
        );
      else if (action === "verify") result = await verifyPayment(id);
      else throw new AppError("Bulunamadı.", 404);
    } else if (root === "admin") {
      await requireRole("admin");
      if (req.method === "GET")
        result = id
          ? await getOrder(id)
          : await db.order.findMany({
              orderBy: { createdAt: "desc" },
              take: 100,
            });
      else if (action === "fulfill")
        result = await fulfillStore(
          id,
          z.string().parse(body.merchant),
          z
            .object({
              purchaseRef: z.string().trim().min(1).max(200).optional(),
              shippingInfo: z.string().trim().min(1).max(500).optional(),
            })
            .parse(body),
        );
      else if (action === "quote") result = await quoteOrder(id, body);
      else if (action === "status")
        result = await updateStatus(
          id,
          z
            .object({
              status: z.string(),
              purchaseRef: z.string().max(200).optional(),
              shippingInfo: z.string().max(500).optional(),
            })
            .parse(body),
        );
      else if (action === "verify") result = await verifyPayment(id);
      else if (action === "refund")
        result = await verifyRefund(
          id,
          z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .parse(body.hash),
        );
      else throw new AppError("Bulunamadı.", 404);
    } else throw new AppError("Bulunamadı.", 404);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    if (e instanceof AppError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json(
      { error: "İşlem tamamlanamadı. Sayfayı yenileyip tekrar deneyin." },
      { status: 500 },
    );
  }
}
export { handle as GET, handle as POST };
