// Real testnet acceptance run. Uses isolated database, generated test-only keys,
// and the same HTTP endpoints as the app. No mainnet configuration is loaded.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

const base = 'http://localhost:3100';
const directory = resolve('output/testnet', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(directory, { recursive: true });
const payer = Keypair.random(), receiver = Keypair.random(), issuer = Keypair.random();
const asset = new Asset('USDC', issuer.publicKey());
const server = new Horizon.Server('https://horizon-testnet.stellar.org');
server.httpClient.defaults.timeout = 30000;
const env = {
  ...process.env, STELLAR_NETWORK: 'testnet', TESTNET_DEMO: '1',
  TESTNET_RECEIVER: receiver.publicKey(), TESTNET_USDC_ISSUER: issuer.publicKey(),
  APP_ORIGIN: base, DATABASE_URL: `file:${directory}/demo.db`,
  ADMIN_PASSWORD: randomBytes(24).toString('base64url'), RAINFOREST_API_KEY: '',
};
const pause = (ms) => new Promise(r => setTimeout(r, ms));
async function submit(key, operations) {
  const tx = new TransactionBuilder(await server.loadAccount(key.publicKey()), {
    fee: '10000', networkPassphrase: Networks.TESTNET,
  });
  for (const op of operations) tx.addOperation(op);
  const built = tx.setTimeout(180).build();
  built.sign(key);
  return server.submitTransaction(built);
}
let child;
try {
  // Do not attach to an unrelated application that happens to own the test port.
  let occupied = false;
  try { await fetch(base, { signal: AbortSignal.timeout(1500) }); occupied = true; } catch {}
  assert.equal(occupied, false, 'Port 3100 is in use. Stop dev:testnet before running this check.');
  console.log('1/7 Creating three funded Stellar TESTNET accounts.');
  for (const key of [issuer, payer, receiver]) {
    const response = await fetch(`https://friendbot.stellar.org?addr=${key.publicKey()}`, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.ok, true, `Friendbot HTTP ${response.status}`);
    await response.json();
  }
  console.log('2/7 Creating trustlines and issuing 100 test USDC (custom demo issuer, no monetary value).');
  await submit(payer, [Operation.changeTrust({ asset })]);
  await submit(receiver, [Operation.changeTrust({ asset })]);
  await submit(issuer, [Operation.payment({ destination: payer.publicKey(), asset, amount: '100' })]);
  const configKeys = ['STELLAR_NETWORK', 'TESTNET_DEMO', 'TESTNET_RECEIVER', 'TESTNET_USDC_ISSUER', 'APP_ORIGIN', 'DATABASE_URL', 'ADMIN_PASSWORD', 'RAINFOREST_API_KEY'];
  writeFileSync('.env.testnet', configKeys.map(k => `${k}=${JSON.stringify(env[k])}`).join('\n') + '\n', { mode: 0o600 });
  writeFileSync('.env.testnet-wallets', [
    '# Generated TESTNET keys only. Never fund on mainnet. Not loaded by the app.',
    `TEST_PAYER_SECRET=${payer.secret()}`, `TEST_RECEIVER_SECRET=${receiver.secret()}`, `TEST_ISSUER_SECRET=${issuer.secret()}`,
  ].join('\n') + '\n', { mode: 0o600 });
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], { env, stdio: 'pipe' });
  const log = openSync(`${directory}/server.log`, 'a');
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', 'localhost', '--port', '3100'], { env, stdio: ['ignore', log, log] });
  closeSync(log);
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error(`App exited; see ${directory}/server.log`);
    try { const r = await fetch(`${base}/api/auth/session`, { signal: AbortSignal.timeout(2000) }); if (r.ok) { ready = true; break; } } catch {}
    await pause(1000);
  }
  assert(ready, 'Test app did not start.');
  async function request(path, body, cookie) {
    return fetch(`${base}/api/${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000),
    });
  }
  async function ok(path, body, cookie) {
    const r = await request(path, body, cookie);
    const data = await r.json();
    assert.equal(r.status, 200, `${path}: ${JSON.stringify(data)}`);
    return data;
  }
  console.log('3/7 Signing wallet login and signing into admin through HTTP.');
  const challenge = await ok('auth/challenge', { wallet: payer.publicKey() });
  const signature = Buffer.from(payer.sign(createHash('sha256').update(`Stellar Signed Message:\n${challenge.message}`).digest())).toString('base64');
  const login = await request('auth/verify', { id: challenge.id, signature });
  assert.equal(login.status, 200, `Wallet login: ${await login.clone().text()}`);
  const user = login.headers.get('set-cookie').split(';')[0];
  const adminLogin = await request('auth/login', { role: 'admin', password: env.ADMIN_PASSWORD });
  assert.equal(adminLogin.status, 200, `Admin login: ${await adminLogin.clone().text()}`);
  const admin = adminLogin.headers.get('set-cookie').split(';')[0];
  const productUrl = process.env.TEST_PRODUCT_URL || 'https://www.amazon.com.tr/dp/B012345678';
  console.log('4/7 Amazon link → cart → address → REQUESTED → admin quote.');
  // Intentionally manual, explicit demo pricing; not a claim of a live Amazon offer.
  await ok('cart', { url: productUrl, quantity: 1, notes: 'TESTNET DEMO — gerçek mağaza siparişi değildir', manualQuote: true }, user);
  const checkout = { key: randomUUID(), address: { name: 'Testnet Demo', phone: '+905550000000', city: 'İstanbul', district: 'Kadıköy', address: 'Test adresidir, gerçek gönderim yapılmaz.', postalCode: '34710' } };
  const order = await ok('orders', checkout, user);
  assert.equal(order.status, 'REQUESTED');
  assert.equal((await ok('orders', checkout, user)).id, order.id);
  const details = await ok(`orders/${order.id}`, undefined, user);
  const quote = await ok(`admin/${order.id}/quote`, {
    items: details.items.map(item => ({ id: item.id, title: 'Jazz III pena — TESTNET demo fiyatı', unitTry: '40' })),
    stores: [{ merchant: 'AMAZON', shippingTry: '0' }], rate: '40', serviceUsdc: '1',
  }, admin);
  assert.equal(quote.totalUsdc, '2.0000000');
  assert.equal(quote.network, 'testnet');
  assert.equal((await request(`admin/${order.id}/fulfill`, { merchant: 'AMAZON', purchaseRef: 'UNPAID-MUST-FAIL' }, admin)).status, 400);
  console.log('5/7 Preparing, signing and sending 2 test USDC to receiver through app.');
  const prepared = await ok(`orders/${order.id}/prepare`, { payer: payer.publicKey() }, user);
  assert.equal(prepared.passphrase, Networks.TESTNET);
  const tx = TransactionBuilder.fromXDR(prepared.xdr, Networks.TESTNET);
  assert.equal(tx.operations[0].destination, receiver.publicKey());
  tx.sign(payer);
  let paid = await ok(`orders/${order.id}/submit`, { signedXdr: tx.toXDR() }, user);
  for (let i = 0; paid.state === 'PENDING' && i < 30; i++) {
    await pause(2000);
    paid = await ok(`orders/${order.id}/verify`, {}, user);
  }
  assert.equal(paid.state, 'PAID');
  assert.equal(paid.order.paidHash, prepared.hash);
  const balance = async () => (await server.loadAccount(receiver.publicKey())).balances.find(b => b.asset_code === 'USDC' && b.asset_issuer === issuer.publicKey()).balance;
  assert.equal(await balance(), '2.0000000');
  const replay = await ok(`orders/${order.id}/submit`, { signedXdr: tx.toXDR() }, user);
  assert.equal(replay.order.paidHash, prepared.hash);
  assert.equal(await balance(), '2.0000000');
  console.log('6/7 Recording demo merchant purchase and shipment after confirmed payment.');
  const purchased = await ok(`admin/${order.id}/fulfill`, { merchant: 'AMAZON', purchaseRef: `DEMO-NOT-AMAZON-${order.id}` }, admin);
  assert.equal(purchased.status, 'PURCHASED');
  const shipped = await ok(`admin/${order.id}/fulfill`, { merchant: 'AMAZON', shippingInfo: 'DEMO — gerçek kargo yok' }, admin);
  assert.equal(shipped.status, 'SHIPPED');
  assert.equal((await ok(`orders/${order.id}`, undefined, user)).status, 'SHIPPED');
  const report = { testedAt: new Date().toISOString(), network: 'testnet', asset: 'USDC', customTestIssuer: issuer.publicKey(), payer: payer.publicKey(), receiver: receiver.publicKey(), productUrl, pricing: 'Manual demo: 40 TRY / 40 + 1 USDC fee = 2 test USDC; not a live Amazon price', orderId: order.id, paidHash: prepared.hash, amount: quote.totalUsdc, receiverBalance: await balance(), finalStatus: shipped.status, realAmazonPurchase: false, signing: 'SDK-generated test wallet; Freighter UI not exercised', explorer: `https://stellar.expert/explorer/testnet/tx/${prepared.hash}` };
  writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2) + '\n');
  writeFileSync('output/testnet/latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`7/7 PASS: ${report.explorer}\nReport: ${directory}/report.json\nReopen app: npm run dev:testnet\nAdmin password: .env.testnet; Freighter test wallet: .env.testnet-wallets (TEST_PAYER_SECRET).`);
} catch (error) {
  // SDK errors may contain request payloads; do not dump key material/configuration.
  console.error(`TESTNET CHECK FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    await stopped;
  }
}
