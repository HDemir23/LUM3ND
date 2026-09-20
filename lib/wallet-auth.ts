import { createHash, randomBytes } from "node:crypto";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { db } from "./db";
import { AppError } from "./domain";
export function messageHash(message: string) {
  return createHash("sha256")
    .update(`Stellar Signed Message:\n${message}`, "utf8")
    .digest();
}
export async function challenge(wallet: string) {
  if (!StrKey.isValidEd25519PublicKey(wallet))
    throw new AppError("Geçersiz cüzdan.");
  const expiresAt = new Date(Date.now() + 300000);
  const message = `LUM3ND cüzdan girişi\nOrigin: ${process.env.APP_ORIGIN}\nWallet: ${wallet}\nNonce: ${randomBytes(32).toString("hex")}\nExpires: ${expiresAt.toISOString()}\nBu imza yalnızca giriş içindir; ödeme yapmaz.`;
  return db.loginChallenge.create({ data: { wallet, message, expiresAt } });
}
export async function consumeChallenge(id: string, signature: string) {
  const c = await db.loginChallenge.findUnique({ where: { id } });
  if (!c || c.usedAt || c.expiresAt.getTime() <= Date.now())
    throw new AppError("Giriş mesajı kullanılmış veya süresi dolmuş.", 401);
  let valid = false;
  try {
    valid = Keypair.fromPublicKey(c.wallet).verify(
      messageHash(c.message),
      Buffer.from(signature, "base64"),
    );
  } catch {}
  if (!valid) throw new AppError("Cüzdan imzası doğrulanamadı.", 401);
  return db.$transaction(async (tx) => {
    const used = await tx.loginChallenge.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1)
      throw new AppError("Giriş mesajı kullanılmış veya süresi dolmuş.", 401);
    await tx.user.upsert({
      where: { wallet: c.wallet },
      create: { wallet: c.wallet },
      update: {},
    });
    return c.wallet;
  });
}
