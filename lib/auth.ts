import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { AppError } from "./domain";
export type Role = "user" | "admin";
const digest = (s: string) => createHash("sha256").update(s).digest();
export async function roleSession(role: Role) {
  const token = (await cookies()).get(`linkshop_${role}`)?.value;
  if (!token) return null;
  return db.session.findFirst({
    where: {
      token: digest(token).toString("hex"),
      role,
      ...(role === "user" ? { wallet: { not: null } } : {}),
      expiresAt: { gt: new Date() },
    },
  });
}
export async function requireRole(role: Role) {
  const session = await roleSession(role);
  if (!session) throw new AppError("Devam etmek için giriş yapın.", 401);
  return session;
}
export async function login(role: Role, password: string) {
  if (role !== "admin")
    throw new AppError("Cüzdan imzasıyla giriş yapın.", 401);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 16 || expected.startsWith("replace-"))
    throw new AppError(
      "Sunucuda güçlü yönetici parolası yapılandırılmalı.",
      503,
    );
  if (!timingSafeEqual(digest(password), digest(expected)))
    throw new AppError("Parola hatalı.", 401);
  await createSession(role);
}
export async function createSession(role: Role, wallet?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 3600_000);
  await db.session.create({
    data: { token: digest(token).toString("hex"), role, expiresAt, wallet },
  });
  (await cookies()).set(`linkshop_${role}`, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(process.env.APP_ORIGIN!).protocol === "https:",
    path: "/",
    expires: expiresAt,
  });
}
export async function logout(role: Role) {
  const jar = await cookies();
  const token = jar.get(`linkshop_${role}`)?.value;
  if (token)
    await db.session.deleteMany({
      where: { token: digest(token).toString("hex") },
    });
  jar.delete(`linkshop_${role}`);
}
export function checkOrigin(req: Request) {
  if (
    !process.env.APP_ORIGIN ||
    req.headers.get("origin") !== process.env.APP_ORIGIN
  )
    throw new AppError("Geçersiz istek kaynağı.", 403);
}
const attempts = new Map<string, { count: number; until: number }>();
export function limitLogin(role: string) {
  const now = Date.now();
  const item = attempts.get(role);
  if (item && item.until > now) {
    if (item.count >= 10)
      throw new AppError("Çok fazla giriş denemesi. 5 dakika bekleyin.", 429);
    item.count++;
  } else attempts.set(role, { count: 1, until: now + 300000 });
}
