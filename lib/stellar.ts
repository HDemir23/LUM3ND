import {
  Asset,
  Horizon,
  Networks,
  StrKey,
  Transaction,
  TransactionBuilder,
  Operation,
  Memo,
} from "@stellar/stellar-sdk";
import Decimal from "decimal.js";
import { AppError } from "./domain";
import type { Order } from "@prisma/client";
export function networkConfig(network = process.env.STELLAR_NETWORK) {
  if (network !== "mainnet" && network !== "testnet")
    throw new AppError("STELLAR_NETWORK testnet veya mainnet olmalı.", 503);
  const prefix = network.toUpperCase();
  const issuer = process.env[`${prefix}_USDC_ISSUER`] || "";
  const receiver = process.env[`${prefix}_RECEIVER`] || "";
  if (
    !StrKey.isValidEd25519PublicKey(issuer) ||
    !StrKey.isValidEd25519PublicKey(receiver)
  )
    throw new AppError(
      `${network}: USDC issuer ve alıcı cüzdanı yapılandırılmalı.`,
      503,
    );
  return {
    network,
    issuer,
    receiver,
    passphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    url:
      network === "mainnet"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org",
  };
}
export function orderConfig(o: Order) {
  const c = networkConfig(o.network!);
  if (c.issuer !== o.issuer || c.receiver !== o.receiver)
    throw new AppError(
      "Ağ ayarları tekliften sonra değişti. Eski ayarları geri yükleyin.",
      409,
    );
  return c;
}
export function horizon(network: string) {
  const server = new Horizon.Server(
    network === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org",
    { allowHttp: false },
  );
  server.httpClient.defaults.timeout = 15000;
  return server;
}
export async function buildPayment(o: Order, payer: string) {
  if (!StrKey.isValidEd25519PublicKey(payer) || payer === o.receiver)
    throw new AppError("Farklı ve geçerli bir gönderen cüzdanı seçin.");
  const c = orderConfig(o);
  const server = horizon(c.network);
  let sender, receiver;
  try {
    [sender, receiver] = await Promise.all([
      server.loadAccount(payer),
      server.loadAccount(c.receiver),
    ]);
  } catch {
    throw new AppError(
      "Cüzdanlar bu ağda bulunamadı veya ağ yanıt vermiyor. XLM bakiyesini ve ağı kontrol edin.",
      503,
    );
  }
  const trust = (account: typeof sender) =>
    account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === "USDC" &&
        b.asset_issuer === c.issuer,
    );
  const s = trust(sender),
    r = trust(receiver);
  if (!s || !r)
    throw new AppError("Her iki cüzdanda doğru USDC trustline’ı bulunmalı.");
  if (
    ("is_authorized" in s && !s.is_authorized) ||
    ("is_authorized" in r && !r.is_authorized)
  )
    throw new AppError("USDC trustline yetkisi eksik.");
  if (
    new Decimal(s.balance)
      .minus("selling_liabilities" in s ? s.selling_liabilities : "0")
      .lt(o.totalUsdc!)
  )
    throw new AppError("Gönderen cüzdanda yeterli USDC yok.");
  if (
    "limit" in r &&
    new Decimal(r.limit)
      .minus(r.balance)
      .minus("buying_liabilities" in r ? r.buying_liabilities : "0")
      .lt(o.totalUsdc!)
  )
    throw new AppError("Alıcı USDC trustline limiti yetersiz.");
  const fee = "10000";
  const native = sender.balances.find((b) => b.asset_type === "native")!;
  const reserve = new Decimal(
    2 +
      sender.subentry_count +
      (sender.num_sponsoring || 0) -
      (sender.num_sponsored || 0),
  ).mul("0.5");
  if (
    new Decimal(native.balance)
      .minus("selling_liabilities" in native ? native.selling_liabilities : "0")
      .lt(reserve.plus(new Decimal(fee).div(1e7)))
  )
    throw new AppError("İşlem ücreti ve hesap rezervi için yeterli XLM yok.");
  const maxTime = Math.floor(o.expiresAt!.getTime() / 1000);
  if (maxTime <= Date.now() / 1000)
    throw new AppError("Teklif süresi doldu. Yeni teklif isteyin.");
  const tx = new TransactionBuilder(sender, {
    fee,
    networkPassphrase: c.passphrase,
    timebounds: { minTime: 0, maxTime },
  })
    .addMemo(Memo.text(o.memo))
    .addOperation(
      Operation.payment({
        destination: c.receiver,
        asset: new Asset("USDC", c.issuer),
        amount: o.totalUsdc!,
      }),
    )
    .build();
  return {
    xdr: tx.toXDR(),
    hash: Buffer.from(tx.hash()).toString("hex"),
    maxTime,
    payer,
  };
}
export type Expected = {
  hash: string;
  source: string;
  destination: string;
  issuer: string;
  amount: string;
  memo: string;
  passphrase: string;
  latest?: number;
  earliest?: number;
};
export function validateChainPayment(
  record: {
    successful: boolean;
    envelope_xdr: string;
    hash: string;
    created_at: string;
  },
  expected: Expected,
) {
  const tx = TransactionBuilder.fromXDR(
    record.envelope_xdr,
    expected.passphrase,
  );
  if (!(tx instanceof Transaction))
    throw new AppError("Desteklenmeyen işlem türü.");
  const op = tx.operations[0];
  const time = new Date(record.created_at).getTime() / 1000;
  if (
    !Number.isFinite(time) ||
    !record.successful ||
    record.hash !== expected.hash ||
    Buffer.from(tx.hash()).toString("hex") !== expected.hash ||
    tx.source !== expected.source ||
    tx.memo.type !== "text" ||
    (typeof tx.memo.value === "string"
      ? tx.memo.value
      : Buffer.from(tx.memo.value as Uint8Array).toString("utf8")) !==
      expected.memo ||
    tx.operations.length !== 1 ||
    op.type !== "payment" ||
    (op.source && op.source !== expected.source) ||
    op.destination !== expected.destination ||
    op.asset.getCode() !== "USDC" ||
    op.asset.getIssuer() !== expected.issuer ||
    !new Decimal(op.amount).eq(expected.amount) ||
    (expected.latest !== undefined && time > expected.latest) ||
    (expected.earliest !== undefined && time < expected.earliest)
  )
    throw new AppError("Zincir işlemi beklenen ödeme bilgileriyle eşleşmiyor.");
}
