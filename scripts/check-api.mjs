import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { PrismaClient } from "@prisma/client";
const base = process.env.APP_ORIGIN || "http://localhost:3000";
const db = new PrismaClient();
const wallets = [Keypair.random(), Keypair.random()];
let admin;
async function request(path, { body, cookie, origin = base } = {}) {
  return fetch(`${base}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: origin }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function ok(path, opts) {
  const r = await request(path, opts);
  assert.equal(r.status, 200, `${path}: ${await r.clone().text()}`);
  return r.json();
}
async function login(key) {
  const c = await ok("auth/challenge", { body: { wallet: key.publicKey() } });
  const payload = createHash("sha256")
    .update(`Stellar Signed Message:\n${c.message}`)
    .digest();
  const body = {
    id: c.id,
    signature: Buffer.from(key.sign(payload)).toString("base64"),
  };
  const r = await request("auth/verify", { body });
  assert.equal(r.status, 200);
  assert.equal((await request("auth/verify", { body })).status, 401);
  return r.headers.get("set-cookie").split(";")[0];
}
try {
  assert.equal((await request("orders")).status, 401);
  assert.equal((await request("cart")).status, 401);
  assert.equal((await request("admin")).status, 401);
  assert.equal(
    (
      await request("auth/challenge", {
        body: { wallet: wallets[0].publicKey() },
        origin: "https://evil.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("auth/login", {
        body: { role: "user", password: "old-password" },
      })
    ).status,
    401,
  );
  const user = await login(wallets[0]),
    other = await login(wallets[1]);
  const adminLogin = await request("auth/login", {
    body: { role: "admin", password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(adminLogin.status, 200);
  admin = adminLogin.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("admin", { cookie: user })).status, 401);
  assert.equal((await request("orders", { cookie: admin })).status, 401);
  const urls = [
    "https://www.amazon.com.tr/dp/B012345678",
    "https://www.trendyol.com/marka/urun-p-12345",
    "https://www.hepsiburada.com/urun-p-HBC000012345",
  ];
  for (const url of urls)
    await ok("cart", {
      cookie: user,
      body: { url, quantity: 1, notes: "API doğrulama" },
    });
  const cart = await ok("cart", { cookie: user });
  assert.equal(cart.length, 3);
  assert.deepEqual(await ok("cart", { cookie: other }), []);
  assert.equal(
    (
      await request(`cart/${cart[0].id}`, {
        cookie: other,
        body: { quantity: 0 },
      })
    ).status,
    404,
  );
  const body = {
    key: randomUUID(),
    address: {
      name: "API Test",
      phone: "+905551234567",
      city: "İstanbul",
      district: "Kadıköy",
      address: "Test Mahallesi Test Sokak 1",
      postalCode: "34710",
    },
    totalUsdc: "0.01",
  };
  const o = await ok("orders", { cookie: user, body });
  assert.equal(o.totalUsdc, null);
  assert.equal((await ok("orders", { cookie: user, body })).id, o.id);
  assert.equal((await ok(`orders/${o.id}`, { cookie: user })).items.length, 3);
  assert.deepEqual(await ok("orders", { cookie: other }), []);
  assert.equal(
    (await request(`orders/${o.id}`, { cookie: other })).status,
    404,
  );
  for (const action of ["prepare", "submit", "verify", "cancel"])
    assert.equal(
      (await request(`orders/${o.id}/${action}`, { cookie: other, body: {} }))
        .status,
      404,
    );
  assert.equal(
    (await fetch(`${base}/orders/${o.id}`, { headers: { Cookie: other } }))
      .status,
    404,
  );
  assert.equal(
    (
      await request(`orders/${o.id}/prepare`, {
        cookie: user,
        body: { payer: wallets[1].publicKey() },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`admin/${o.id}/quote`, { cookie: user, body: {} })).status,
    401,
  );
  assert.equal(
    (
      await request(`admin/${o.id}/status`, {
        cookie: admin,
        body: { status: "PAID" },
      })
    ).status,
    400,
  );
  await ok(`orders/${o.id}/cancel`, { cookie: user, body: {} });
  await ok("auth/logout", { cookie: user, body: { role: "user" } });
  assert.equal((await request("orders", { cookie: user })).status, 401);
  console.log(
    "API checks passed: signed wallet login, replay rejection, two-wallet ownership (API + page), cart persistence, idempotency, role/origin protection, payer mismatch, cancellation and logout.",
  );
} finally {
  if (admin)
    await request("auth/logout", { cookie: admin, body: { role: "admin" } });
  const addresses = wallets.map((x) => x.publicKey());
  const orders = await db.order.findMany({
    where: { wallet: { in: addresses } },
    select: { id: true },
  });
  const orderId = { in: orders.map((x) => x.id) };
  await db.attempt.deleteMany({ where: { orderId } });
  await db.orderItem.deleteMany({ where: { orderId } });
  await db.orderAddress.deleteMany({ where: { orderId } });
  await db.merchantOrder.deleteMany({ where: { orderId } });
  await db.order.deleteMany({ where: { id: orderId } });
  await db.cartItem.deleteMany({ where: { wallet: { in: addresses } } });
  await db.session.deleteMany({ where: { wallet: { in: addresses } } });
  await db.loginChallenge.deleteMany({ where: { wallet: { in: addresses } } });
  await db.user.deleteMany({ where: { wallet: { in: addresses } } });
  await db.$disconnect();
}
