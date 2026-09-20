import { test } from "node:test";
import assert from "node:assert/strict";
import { connectWallet, loginDestination, type WalletBridge } from "../lib/wallet-connection";

const bridge: WalletBridge = {
  requestAccess: async () => ({ address: "wallet-a" }),
  signMessage: async () => ({ signerAddress: "wallet-a", signedMessage: new Uint8Array([0, 1, 254, 255]) }),
};
test("wallet connection waits for signature verification and encodes byte signatures as base64", async () => {
  const calls: string[] = [];
  const wallet = await connectWallet(bridge, async (path, body) => {
    calls.push(path);
    if (path === "auth/challenge") return { id: "challenge", message: "Sign in" };
    assert.equal(body.signature, "AAH+/w==");
    return { wallet: "wallet-a" };
  }, step => calls.push(step));
  assert.equal(wallet, "wallet-a");
  assert.deepEqual(calls, ["connecting", "auth/challenge", "signing", "verifying", "auth/verify"]);
});
test("denied wallet access never requests a challenge or a signature", async () => {
  await assert.rejects(connectWallet({ ...bridge, requestAccess: async () => ({ address: "", error: "denied" }) }, async () => { assert.fail("Must not call API"); }, () => {}), /Bağlantı onaylanmadı/);
});
test("rejected signature and changed signer never create a session", async () => {
  for (const result of [{ signerAddress: "wallet-a", signedMessage: null, error: "denied" }, { signerAddress: "wallet-b", signedMessage: "signature" }]) {
    await assert.rejects(connectWallet({ ...bridge, signMessage: async () => result }, async path => {
      assert.equal(path, "auth/challenge");
      return { id: "challenge", message: "Sign in" };
    }, () => {}), /onaylanmadı|cüzdan değişti/);
  }
});
test("server verification failure is surfaced instead of reporting a connected wallet", async () => {
  await assert.rejects(connectWallet(bridge, async path => {
    if (path === "auth/verify") throw new Error("Giriş mesajının süresi doldu.");
    return { id: "challenge", message: "Sign in" };
  }, () => {}), /süresi doldu/);
});
test("login returns to product/order but rejects external and recursive login redirects", () => {
  for (const path of ["/?url=https%3A%2F%2Fwww.amazon.com.tr%2Fdp%2FB012345678", "/orders/123", "/travel", "/hotels"]) assert.equal(loginDestination(path), path);
  for (const path of [null, "https://evil.example", "//evil.example", "/\\evil.example", "/login?next=/login", "/admin", "/orders/../../login"]) assert.equal(loginDestination(path), "/");
});
