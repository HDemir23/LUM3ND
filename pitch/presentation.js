const pptxgen = require("pptxgenjs");
const path = require("path");

const A = (f) => path.join(__dirname, "assets", f);

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3" × 7.5"
  pres.author = "SP3ND";
  pres.title = "SP3ND — Spend freely. Settle simply.";
  pres.subject = "Rise In × Stellar Pro Hackathon 2026 · Istanbul";

  const C = {
    bg: "0E0E0E",
    bgAlt: "141414",
    card: "1A1A1A",
    card2: "202020",
    line: "2A2A2A",
    mint: "17C7BA",
    mint2: "20D4C7",
    mintDeep: "0E7A73",
    white: "F5F5F5",
    gray: "A3A3A3",
    grayLight: "D4D4D4",
    grayDark: "737373",
    warn: "E8B86D",
  };

  const TOTAL = 14;
  const mkS = () => ({
    type: "outer",
    blur: 12,
    offset: 3,
    angle: 135,
    color: "000000",
    opacity: 0.4,
  });

  function addFooter(slide, num) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0,
      y: 7.22,
      w: 13.3,
      h: 0.28,
      fill: { color: C.bg },
    });
    slide.addText("SP3ND  ·  STELLAR PRO HACKATHON 2026  ·  ISTANBUL", {
      x: 0.55,
      y: 7.22,
      w: 8.5,
      h: 0.24,
      fontSize: 10,
      fontFace: "Arial",
      color: C.grayDark,
      charSpacing: 1.2,
      margin: 0,
      valign: "middle",
    });
    slide.addText(`${num}  /  ${TOTAL}`, {
      x: 11.3,
      y: 7.22,
      w: 1.45,
      h: 0.24,
      fontSize: 10,
      fontFace: "Arial",
      color: C.grayDark,
      align: "right",
      margin: 0,
      valign: "middle",
    });
  }

  function addHeader(slide, kicker, title, w = 12.2) {
    slide.addText(kicker, {
      x: 0.55,
      y: 0.28,
      w: 12.2,
      h: 0.28,
      fontSize: 11,
      fontFace: "Arial",
      bold: true,
      color: C.mint,
      charSpacing: 2.4,
      margin: 0,
    });
    slide.addText(title, {
      x: 0.55,
      y: 0.54,
      w,
      h: 0.7,
      fontSize: 26,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.white,
      margin: 0,
    });
  }

  function card(slide, x, y, w, h, accent) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x,
      y,
      w,
      h,
      fill: { color: C.card },
      rectRadius: 0.08,
      shadow: mkS(),
    });
    if (accent) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x,
        y,
        w,
        h: 0.07,
        fill: { color: accent },
      });
    }
  }

  // ============================================================
  // 1. TITLE
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    s.addImage({
      path: A("logo-icon.png"),
      x: 0.55,
      y: 0.42,
      w: 0.42,
      h: 0.4,
    });
    s.addImage({
      path: A("logo-wordmark.png"),
      x: 1.05,
      y: 0.46,
      w: 2.15,
      h: 0.335,
    });
    s.addText("RISE IN  ×  STELLAR PRO HACKATHON  ·  19–20 SEP 2026", {
      x: 3.5,
      y: 0.5,
      w: 9.2,
      h: 0.28,
      fontSize: 12,
      fontFace: "Arial",
      color: C.grayDark,
      align: "right",
      charSpacing: 1.4,
      margin: 0,
    });

    s.addText("Spend freely.", {
      x: 0.55,
      y: 1.7,
      w: 7.2,
      h: 0.85,
      fontSize: 48,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.white,
      margin: 0,
    });
    s.addText("Settle simply.", {
      x: 0.55,
      y: 2.5,
      w: 7.2,
      h: 0.85,
      fontSize: 48,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.mint,
      margin: 0,
    });
    s.addText(
      "One USDC payment on Stellar. Real goods from Amazon Türkiye,\nTrendyol, and Hepsiburada — delivered to a Turkish address.",
      {
        x: 0.55,
        y: 3.5,
        w: 6.8,
        h: 0.7,
        fontSize: 16,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      }
    );

    const pills = [
      { t: "LOCAL COMMERCE", x: 0.55 },
      { t: "STELLAR USDC", x: 2.85 },
      { t: "FREIGHTER + SEP-53", x: 4.9 },
    ];
    pills.forEach((p) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: p.x,
        y: 4.4,
        w: 2.15,
        h: 0.36,
        fill: { color: C.card },
        rectRadius: 0.08,
      });
      s.addText(p.t, {
        x: p.x,
        y: 4.4,
        w: 2.15,
        h: 0.36,
        fontSize: 10,
        fontFace: "Arial",
        bold: true,
        color: C.mint,
        align: "center",
        valign: "middle",
        margin: 0,
        charSpacing: 0.8,
      });
    });

    s.addText(
      "Working app in-repo  ·  github.com/HDemir23/SP3ND  ·  sp3nd.shop",
      {
        x: 0.55,
        y: 6.55,
        w: 7.4,
        h: 0.3,
        fontSize: 13,
        fontFace: "Arial",
        color: C.grayDark,
        margin: 0,
      }
    );

    // Product frame
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 7.55,
      y: 1.35,
      w: 5.2,
      h: 5.2 / (1440 / 810),
      fill: { color: C.card2 },
      rectRadius: 0.08,
      shadow: mkS(),
    });
    s.addImage({
      path: A("home-hero.png"),
      x: 7.62,
      y: 1.42,
      w: 5.06,
      h: 5.06 / (1440 / 810),
    });

    s.addNotes(
      "Açılış: SP3ND, Stellar USDC ile Türkiye'deki gerçek e-ticaret sitelerinden alışveriş. Kart uygulamaya girmez. Tek cüzdan imzası, tek USDC ödemesi, operatör mağazadan satın alır. Jüriye 14 slayt; demo DEMO.md senaryosu."
    );
  }

  // ============================================================
  // 2. WHY
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "1  ·  MEANINGFUL IDEA",
      "USDC sits in wallets. Shopping still needs a card."
    );
    addFooter(s, 2);

    const cols = [
      {
        h: "THE LOCK",
        b: "Amazon Türkiye, Trendyol, and Hepsiburada do not take Stellar USDC. A holder who wants a real product still has to off-ramp, wire TRY, and check out as a card customer.",
      },
      {
        h: "THE COST",
        b: "Each hop adds FX spread, banking hours, and KYC. Remittances become cash, not the actual goods a family asked for. Crypto-native users bounce before they spend.",
      },
      {
        h: "THE GAP",
        b: "Stellar already moves dollars in seconds. Turkey already has dense e-commerce. Nobody connects the two without asking the shopper for a card or a private key.",
      },
    ];
    cols.forEach((c, i) => {
      const x = 0.55 + i * 4.15;
      card(s, x, 1.5, 3.95, 2.85, C.mint);
      s.addText(c.h, {
        x: x + 0.22,
        y: 1.75,
        w: 3.5,
        h: 0.35,
        fontSize: 14,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.mint,
        charSpacing: 1.4,
        margin: 0,
      });
      s.addText(c.b, {
        x: x + 0.22,
        y: 2.2,
        w: 3.5,
        h: 1.9,
        fontSize: 15,
        fontFace: "Arial",
        color: C.grayLight,
        margin: 0,
      });
    });

    s.addText(
      "Use case: local payments + commerce. Not a demo swap. A rail that turns Stellar dollars into a parcel at a Turkish door.",
      {
        x: 0.55,
        y: 4.6,
        w: 12.2,
        h: 0.4,
        fontSize: 14,
        fontFace: "Arial",
        italic: true,
        color: C.gray,
        margin: 0,
      }
    );

    s.addNotes(
      "Problem: Türkiye'de USDC ile Amazon/Trendyol/HB alışverişi yok. Off-ramp + kart zorunlu. SP3ND bu boşluğu kapatır: zincirde ödeme, kapıda ürün."
    );
  }

  // ============================================================
  // 3. WHO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "1  ·  WHO BENEFITS",
      "A clear buyer — and a desk that can serve them this week"
    );
    addFooter(s, 3);

    const who = [
      {
        n: "01",
        t: "USDC holders in Turkey",
        d: "People who already keep dollars on Stellar and want a keyboard, a phone case, or a gift without opening a bank transfer.",
      },
      {
        n: "02",
        t: "Diaspora sending goods, not cash",
        d: "A relative abroad pays in USDC. The parcel lands at a Turkish address. Remittance becomes a delivered product.",
      },
      {
        n: "03",
        t: "Crypto-native shoppers",
        d: "Paste a product URL, review a 15-minute quote, sign once in Freighter. No card number ever enters the app.",
      },
      {
        n: "04",
        t: "The operator desk",
        d: "A human merchant-of-record who already has store accounts. They buy, attach real order refs, and ship. The protocol does not scrape cards.",
      },
    ];
    who.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.55 + col * 6.35;
      const y = 1.45 + row * 2.55;
      card(s, x, y, 6.1, 2.35, C.mint);
      s.addText(item.n, {
        x: x + 0.28,
        y: y + 0.28,
        w: 1.0,
        h: 0.4,
        fontSize: 18,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.mint,
        margin: 0,
      });
      s.addText(item.t, {
        x: x + 1.3,
        y: y + 0.3,
        w: 4.5,
        h: 0.4,
        fontSize: 18,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        margin: 0,
      });
      s.addText(item.d, {
        x: x + 0.28,
        y: y + 0.9,
        w: 5.5,
        h: 1.15,
        fontSize: 14,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      });
    });

    s.addNotes(
      "Hedef: Türkiye'de USDC tutanlar, yurtdışından mal gönderen diaspora, kart vermek istemeyen kripto kullanıcıları. Operatör = merchant of record."
    );
  }

  // ============================================================
  // 4. SOLUTION
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "VALUE PROPOSITION",
      "Paste a link. Pay USDC once. Get the thing."
    );
    addFooter(s, 4);

    const props = [
      { k: "3 stores", v: "One cart", d: "Amazon TR, Trendyol, Hepsiburada in a single quote." },
      { k: "1 transfer", v: "One USDC total", d: "Goods + shipping + 1 USDC per unit. No second charge." },
      { k: "0 cards", v: "Keys stay local", d: "Freighter signs. The app never sees a secret or a PAN." },
      { k: "15 min", v: "Firm quote", d: "Admin-verified TRY prices, TCMB FX, then a locked USDC amount." },
    ];
    props.forEach((p, i) => {
      const x = 0.55 + i * 3.15;
      card(s, x, 1.5, 3.0, 2.85, C.mint);
      s.addText(p.k, {
        x: x + 0.18,
        y: 1.72,
        w: 2.64,
        h: 0.3,
        fontSize: 12,
        fontFace: "Arial",
        bold: true,
        color: C.mint,
        charSpacing: 1.2,
        margin: 0,
      });
      s.addText(p.v, {
        x: x + 0.18,
        y: 2.1,
        w: 2.64,
        h: 0.85,
        fontSize: 22,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        margin: 0,
      });
      s.addText(p.d, {
        x: x + 0.18,
        y: 3.05,
        w: 2.64,
        h: 1.05,
        fontSize: 14,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      });
    });

    s.addText(
      "What we refused to fake: auto-buy on merchant sites, escrow we do not yet have, and partial refunds. The operator buys with their own account. The chain only moves USDC.",
      {
        x: 0.55,
        y: 4.6,
        w: 12.2,
        h: 0.45,
        fontSize: 14,
        fontFace: "Arial",
        italic: true,
        color: C.gray,
        margin: 0,
      }
    );

    s.addNotes(
      "Değer: tek sepet, tek USDC, kart yok, 15 dk teklif. Kapsam dışı: otomatik mağaza satın alma, escrow, kısmi iade. Dürüst MVP."
    );
  }

  // ============================================================
  // 5. FLOW
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "2  ·  MVP  ·  USER FLOW",
      "Seven steps judges can click without a script rewrite"
    );
    addFooter(s, 5);

    const steps = [
      { n: "1", t: "Sign in", d: "5-minute Freighter message. Reject it and there is no session." },
      { n: "2", t: "Cart", d: "Three store URLs. Qty + note. Same URL bumps qty. Reload keeps the cart." },
      { n: "3", t: "Address", d: "Turkish delivery fields. One request copies cart + address into an order." },
      { n: "4", t: "Quote", d: "Admin confirms TRY, FX, shipping. Fee is 1 USDC per unit. 15-minute lock." },
      { n: "5", t: "Pay", d: "Server builds XDR. User signs. Horizon must match the exact payment." },
      { n: "6", t: "Fulfill", d: "Operator buys per store. Partial, then purchased, then shipped." },
      { n: "7", t: "Refund", d: "Full USDC only, memo R+order. No partial refunds." },
    ];
    steps.forEach((st, i) => {
      const x = 0.55 + (i % 7) * 1.8;
      const y = 1.5;
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.52,
        y: y,
        w: 0.5,
        h: 0.5,
        fill: { color: C.mint },
      });
      s.addText(st.n, {
        x: x + 0.52,
        y: y,
        w: 0.5,
        h: 0.5,
        fontSize: 16,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.bg,
        align: "center",
        valign: "middle",
        margin: 0,
      });
      if (i < 6) {
        s.addShape(pres.shapes.RECTANGLE, {
          x: x + 1.1,
          y: y + 0.22,
          w: 1.15,
          h: 0.045,
          fill: { color: C.mintDeep },
        });
      }
      s.addText(st.t, {
        x: x,
        y: y + 0.65,
        w: 1.7,
        h: 0.35,
        fontSize: 14,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        align: "center",
        margin: 0,
      });
      s.addText(st.d, {
        x: x,
        y: y + 1.05,
        w: 1.7,
        h: 1.7,
        fontSize: 12,
        fontFace: "Arial",
        color: C.gray,
        align: "center",
        margin: 0,
      });
    });

    card(s, 0.55, 4.85, 12.2, 2.05, null);
    s.addText("Wallet isolation is part of the product, not a footnote.", {
      x: 0.8,
      y: 5.05,
      w: 11.7,
      h: 0.35,
      fontSize: 16,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.mint,
      margin: 0,
    });
    s.addText(
      "A second Freighter account must not see the first wallet’s cart, address, or orders. Switching accounts forces a new sign-in. Payment XDR is bound to the session wallet. Chrome extension only has activeTab — it never stores a session.",
      {
        x: 0.8,
        y: 5.5,
        w: 11.7,
        h: 1.1,
        fontSize: 15,
        fontFace: "Arial",
        color: C.grayLight,
        margin: 0,
      }
    );

    s.addNotes(
      "Demo sırası: giriş (reddet=oturum yok) → 3 mağaza sepet → adres → admin teklif → Freighter ödeme → satın alma durumları → tam iade. İkinci cüzdan izolasyonu göster."
    );
  }

  // ============================================================
  // 6. PRODUCT
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "4  ·  USER EXPERIENCE",
      "A shop a non-crypto relative can finish"
    );
    addFooter(s, 6);

    const deskW = 8.15;
    const deskH = deskW / (1440 / 810);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5,
      y: 1.4,
      w: deskW + 0.1,
      h: deskH + 0.1,
      fill: { color: C.card },
      rectRadius: 0.08,
      shadow: mkS(),
    });
    s.addImage({
      path: A("home-hero.png"),
      x: 0.55,
      y: 1.45,
      w: deskW,
      h: deskH,
    });

    const phoneH = 5.35;
    const phoneW = phoneH * (399 / 900);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 9.15,
      y: 1.4,
      w: phoneW + 0.12,
      h: phoneH + 0.12,
      fill: { color: C.card },
      rectRadius: 0.12,
      shadow: mkS(),
    });
    s.addImage({
      path: A("mobile-hero.png"),
      x: 9.21,
      y: 1.46,
      w: phoneW,
      h: phoneH,
    });

    s.addText(
      "Mosaic storefront  ·  paste-a-link cart  ·  Chrome extension  ·  Turkish copy throughout",
      {
        x: 0.55,
        y: 6.55,
        w: 8.2,
        h: 0.28,
        fontSize: 13,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      }
    );

    s.addNotes(
      "UX: kripto bilmeyen biri de link yapıştırıp teklif görür. Mobil ve masaüstü aynı akış. Extension ürün sayfasından URL taşır, sepete kendi başına eklemez."
    );
  }

  // ============================================================
  // 7. QUOTE + PAY
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "PAYMENT MATH",
      "The quote is a formula. The payment is a real USDC operation."
    );
    addFooter(s, 7);

    card(s, 0.55, 1.45, 7.4, 5.4, C.mint);
    s.addText("SERVER-SIDE TOTAL", {
      x: 0.8,
      y: 1.7,
      w: 6.9,
      h: 0.28,
      fontSize: 12,
      fontFace: "Arial",
      bold: true,
      color: C.mint,
      charSpacing: 1.6,
      margin: 0,
    });
    s.addText(
      [
        { text: "USDC  =  (goods TRY + shipping TRY) / USDTRY", options: { breakLine: true } },
        { text: "         +  1 USDC  ×  quantity" },
      ],
      {
        x: 0.8,
        y: 2.05,
        w: 6.9,
        h: 0.7,
        fontSize: 14,
        fontFace: "Menlo",
        color: C.white,
        margin: 0,
      }
    );
    const rules = [
      ["Service fee", "1 USDC per unit. Client cannot override it."],
      ["FX", "Admin confirms TCMB USD selling rate (4 dp)."],
      ["Rounding", "Decimal.js, USDC rounded up to 7 dp."],
      ["Lock", "15 minutes. Timebounds on the Stellar tx."],
      ["XDR", "Built on the server. Freighter only signs."],
      ["Paid status", "Only after Horizon matches hash, payer, receiver, issuer, amount, memo, time."],
    ];
    rules.forEach((r, i) => {
      const y = 2.9 + i * 0.58;
      s.addText(r[0], {
        x: 0.8,
        y,
        w: 1.9,
        h: 0.5,
        fontSize: 13,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.mint,
        margin: 0,
        valign: "top",
      });
      s.addText(r[1], {
        x: 2.75,
        y,
        w: 4.9,
        h: 0.5,
        fontSize: 14,
        fontFace: "Arial",
        color: C.grayLight,
        margin: 0,
        valign: "top",
      });
    });

    const side = [
      { t: "No double pay", d: "Network delay keeps watching the same hash. A second payment is not prepared." },
      { t: "Refresh-safe", d: "Reload continues polling. Quote/cancel stay locked while an attempt is live." },
      { t: "Reject-safe", d: "If Freighter refuses, the same XDR can be signed again." },
      { t: "Unlock rule", d: "After expiry + 60s of Horizon ledger time, the hash is checked, then the lock lifts." },
    ];
    side.forEach((item, i) => {
      const y = 1.45 + i * 1.35;
      card(s, 8.15, y, 4.6, 1.22, C.mint);
      s.addText(item.t, {
        x: 8.38,
        y: y + 0.14,
        w: 4.15,
        h: 0.32,
        fontSize: 15,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        margin: 0,
      });
      s.addText(item.d, {
        x: 8.38,
        y: y + 0.48,
        w: 4.15,
        h: 0.6,
        fontSize: 13,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      });
    });

    s.addNotes(
      "Formül: (ürün TRY + kargo TRY) / kur + adet başına 1 USDC. İstemci hizmet bedelini değiştiremez. Ödendi ancak Horizon eşleşmesiyle. Aynı hash izlenir, ikinci ödeme yok."
    );
  }

  // ============================================================
  // 8. ARCHITECTURE
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "3  ·  TECHNICAL DOCUMENTATION",
      "Classic Stellar payments, a Next.js desk, no secrets on the server"
    );
    addFooter(s, 8);

    const boxes = [
      { x: 0.55, y: 1.45, w: 4.0, h: 1.35, t: "CLIENT", d: "Next.js 16  ·  Freighter API\nChrome extension (activeTab)" },
      { x: 4.7, y: 1.45, w: 4.0, h: 1.35, t: "APP", d: "Route handlers  ·  Prisma\nWallet-scoped sessions (8h)" },
      { x: 8.85, y: 1.45, w: 3.9, h: 1.35, t: "DATA", d: "SQLite  ·  cart, orders, memos\nLogin challenges, payment attempts" },
      { x: 0.55, y: 3.05, w: 4.0, h: 1.35, t: "STELLAR", d: "stellar-sdk  ·  Horizon\nUSDC payment + memo + timebounds" },
      { x: 4.7, y: 3.05, w: 4.0, h: 1.35, t: "AUTH", d: "SEP-53 message signing\nSHA-256 + Ed25519, one-time nonce" },
      { x: 8.85, y: 3.05, w: 3.9, h: 1.35, t: "FX / CATALOG", d: "TCMB USD selling rate\nAmazon TR fetch · Rainforest fallback" },
      { x: 0.55, y: 4.65, w: 6.15, h: 1.35, t: "OPERATOR", d: "Admin quotes, store-by-store purchase refs, shipping, full refund (R + memo)" },
      { x: 6.9, y: 4.65, w: 5.85, h: 1.35, t: "MERCHANTS", d: "Amazon Türkiye  ·  Trendyol  ·  Hepsiburada — bought with the operator’s own account, never the app’s" },
    ];
    boxes.forEach((b) => {
      card(s, b.x, b.y, b.w, b.h, C.mint);
      s.addText(b.t, {
        x: b.x + 0.2,
        y: b.y + 0.18,
        w: b.w - 0.4,
        h: 0.28,
        fontSize: 12,
        fontFace: "Arial",
        bold: true,
        color: C.mint,
        charSpacing: 1.4,
        margin: 0,
      });
      s.addText(b.d, {
        x: b.x + 0.2,
        y: b.y + 0.5,
        w: b.w - 0.4,
        h: 0.7,
        fontSize: 14,
        fontFace: "Arial",
        color: C.grayLight,
        margin: 0,
      });
    });

    s.addNotes(
      `Mimari (Mermaid):\nflowchart LR\n  U[Chrome + Freighter] --> A[Next.js]\n  E[Extension] --> A\n  A --> DB[(SQLite)]\n  A --> H[Horizon]\n  A --> FX[TCMB + catalog]\n  H --> USDC[Circle USDC]\n  OP[Admin] --> M[Amazon TR / Trendyol / HB]\nSoroban yok: klasik payment. Escrow yol haritasında.`
    );
  }

  // ============================================================
  // 9. STELLAR FIT
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "3  ·  ECOSYSTEM FIT",
      "Stellar is the checkout, not a badge on the footer"
    );
    addFooter(s, 9);

    const rows = [
      ["Freighter", "Wallet connect, message sign-in, and the USDC payment signature. Nothing is custodied."],
      ["SEP-53", "Documented signed-message format. Origin + wallet + nonce + 5-minute expiry. Atomic one-time use."],
      ["Circle USDC", "Testnet issuer GBBD47…FLA5  ·  Mainnet issuer GA5ZSEJY…KZVN. Trustlines checked on both sides."],
      ["Horizon + SDK", "@stellar/stellar-sdk builds the XDR, submits, and verifies the exact payment operation."],
      ["Memo + bounds", "Order memo on the payment. maxTime = quote expiry. Replay and overpay are rejected."],
      ["Skills / docs", "Stellar signing docs, SEP-53, Freighter API, Horizon. TR Mock Anchor is next — not a mocked SEP-6 today."],
    ];
    rows.forEach((r, i) => {
      const y = 1.4 + i * 0.88;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.55,
        y,
        w: 12.2,
        h: 0.78,
        fill: { color: i % 2 === 0 ? C.card : C.bgAlt },
        rectRadius: 0.06,
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.55,
        y,
        w: 0.08,
        h: 0.78,
        fill: { color: C.mint },
      });
      s.addText(r[0], {
        x: 0.9,
        y,
        w: 2.4,
        h: 0.78,
        fontSize: 15,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.mint,
        valign: "middle",
        margin: 0,
      });
      s.addText(r[1], {
        x: 3.4,
        y,
        w: 9.1,
        h: 0.78,
        fontSize: 14,
        fontFace: "Arial",
        color: C.grayLight,
        valign: "middle",
        margin: 0,
      });
    });

    s.addNotes(
      "Stellar çekirdekte: Freighter, SEP-53, Circle USDC, Horizon doğrulama. Anchor henüz yok — bunu bir sonraki slaytta açık söyle. Sahte SEP-6 göstermiyoruz."
    );
  }

  // ============================================================
  // 10. TECHNICAL QUALITY
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "2  ·  TECHNICAL IMPLEMENTATION",
      "Not mocked. Not hardcoded. Deliberately scoped."
    );
    addFooter(s, 10);

    const left = [
      { t: "Real Horizon path", d: "npm run test:testnet funds Friendbot accounts, opens trustlines, issues demo USDC, and drives the HTTP API against live testnet." },
      { t: "Unit + API tests", d: "npm test uses temp SQLite and a fake Horizon. npm run test:api signs two wallets and asserts isolation, then deletes its rows." },
      { t: "Idempotent checkout", d: "Wallet-bound checkout key returns the same order on retry. Cart lines unique on wallet + URL + notes." },
    ];
    const right = [
      { t: "What is out of scope", d: "No Soroban contract in this MVP. No SEP-6 deposit. No automatic merchant purchase. No partial refund. No card vault." },
      { t: "Why that is a feature", d: "A broken escrow or a scraped store login would fail the demo. A signed USDC payment and a human desk will not." },
      { t: "Passkeys / smart wallets", d: "Treated as a bonus, as the brief asks. Freighter is the supported signer today." },
    ];
    left.forEach((item, i) => {
      const y = 1.45 + i * 1.75;
      card(s, 0.55, y, 6.1, 1.6, C.mint);
      s.addText(item.t, {
        x: 0.8,
        y: y + 0.18,
        w: 5.6,
        h: 0.35,
        fontSize: 16,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        margin: 0,
      });
      s.addText(item.d, {
        x: 0.8,
        y: y + 0.58,
        w: 5.6,
        h: 0.85,
        fontSize: 14,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      });
    });
    right.forEach((item, i) => {
      const y = 1.45 + i * 1.75;
      card(s, 6.85, y, 5.9, 1.6, C.warn);
      s.addText(item.t, {
        x: 7.1,
        y: y + 0.18,
        w: 5.4,
        h: 0.35,
        fontSize: 16,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.warn,
        margin: 0,
      });
      s.addText(item.d, {
        x: 7.1,
        y: y + 0.58,
        w: 5.4,
        h: 0.85,
        fontSize: 14,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      });
    });

    s.addNotes(
      "Dürüstlük: Soroban/Anchor yok. Testnet script gerçek Horizon kullanır. Otomatik testler gerçek mağaza siparişi veya mainnet ödeme sayılmaz — DEMO.md'de yazıyor."
    );
  }

  // ============================================================
  // 11. ROADMAP
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "5  ·  TRACTION & CONTINUITY",
      "Ship the desk, then put TRY on-ramp and escrow on-chain"
    );
    addFooter(s, 11);

    const phases = [
      {
        p: "NOW",
        c: C.mint,
        items: [
          "Freighter login + USDC pay",
          "3-store cart, TR address",
          "Admin quote / buy / ship / refund",
          "Chrome extension",
        ],
      },
      {
        p: "NEXT 90 DAYS",
        c: C.mint2,
        items: [
          "TR Mock Anchor (SEP-6 / 10 / 38)",
          "TRY deposit → USDC in-app",
          "Soroban escrow: release on fulfill",
          "Live small mainnet orders",
        ],
      },
      {
        p: "SCF / INSTAAWARDS",
        c: C.warn,
        items: [
          "Licensed TRY anchor partner",
          "More TR merchants",
          "Diaspora GTM in EU/UK/DE",
          "Passkey smart wallets",
        ],
      },
    ];
    phases.forEach((ph, i) => {
      const x = 0.55 + i * 4.15;
      card(s, x, 1.45, 3.95, 4.0, ph.c);
      s.addText(ph.p, {
        x: x + 0.22,
        y: 1.7,
        w: 3.5,
        h: 0.35,
        fontSize: 13,
        fontFace: "Arial",
        bold: true,
        color: ph.c,
        charSpacing: 1.6,
        margin: 0,
      });
      ph.items.forEach((it, j) => {
        s.addText(it, {
          x: x + 0.22,
          y: 2.25 + j * 0.7,
          w: 3.5,
          h: 0.6,
          fontSize: 16,
          fontFace: "Arial",
          color: C.white,
          margin: 0,
        });
      });
    });

    s.addText(
      "Intended next step: Stellar Community Fund, with InstaAwards as the fast path if the live desk proves a handful of real parcels.",
      {
        x: 0.55,
        y: 5.65,
        w: 12.2,
        h: 0.4,
        fontSize: 14,
        fontFace: "Arial",
        italic: true,
        color: C.gray,
        margin: 0,
      }
    );

    s.addNotes(
      "Devam: SCF. 90 gün: TR Mock Anchor (SEP-6/10/38) + Soroban escrow. Bugün çalışan şey: klasik USDC ödeme + operatör masası. Mainnet alıcı cüzdanı .env MAINNET_RECEIVER."
    );
  }

  // ============================================================
  // 12. DEMO SCRIPT
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "LIVE DEMO",
      "The acceptance script — same order as DEMO.md"
    );
    addFooter(s, 12);

    const demo = [
      ["Sign in", "Chrome + Freighter. Sign the 5-minute message. Reject it once so judges see no session."],
      ["Cart", "Amazon TR, Hepsiburada, Trendyol — one each. Qty + color/size note. Repeat URL bumps qty. Reload. Extension fetch + confirm."],
      ["Address", "Fill a Turkish address. One quote request. Order shows three merchants + the address."],
      ["Quote", "Admin: name, unit TRY, USDTRY, per-store shipping. Fee = 1 USDC/unit. User sees breakdown + 15:00."],
      ["Pay", "Freighter: wallet, network, receiver, amount. Sign a small real payment. Explorer link. Same hash if delayed."],
      ["Fulfill", "Operator buys on store accounts. Attach real refs. Partial then purchased, then partial/full shipped."],
      ["Refund", "If needed: full refund only. Send R+memo from the desk wallet. Panel verifies the hash."],
    ];
    demo.forEach((row, i) => {
      const y = 1.38 + i * 0.76;
      s.addShape(pres.shapes.OVAL, {
        x: 0.55,
        y: y + 0.12,
        w: 0.42,
        h: 0.42,
        fill: { color: C.mint },
      });
      s.addText(String(i + 1), {
        x: 0.55,
        y: y + 0.12,
        w: 0.42,
        h: 0.42,
        fontSize: 13,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.bg,
        align: "center",
        valign: "middle",
        margin: 0,
      });
      s.addText(row[0], {
        x: 1.15,
        y,
        w: 2.15,
        h: 0.68,
        fontSize: 15,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        valign: "middle",
        margin: 0,
      });
      s.addText(row[1], {
        x: 3.4,
        y,
        w: 9.3,
        h: 0.68,
        fontSize: 14,
        fontFace: "Arial",
        color: C.grayLight,
        valign: "middle",
        margin: 0,
      });
    });

    s.addNotes(
      "Canlı demo bu sırayla. Cüzdan yoksa ödeme/satın alma kabulü bekler — slayt 13. İkinci cüzdanla izolasyonu unutma."
    );
  }

  // ============================================================
  // 13. EVALUATE
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    addHeader(
      s,
      "6  ·  PRESENTATION & DOCS",
      "Everything a judge needs to run, click, and score"
    );
    addFooter(s, 13);

    const links = [
      { k: "GitHub", v: "github.com/HDemir23/SP3ND" },
      { k: "Public site", v: "www.sp3nd.shop" },
      { k: "Local app", v: "localhost:3000 after npm ci && npm run setup && npm run dev" },
      { k: "Admin", v: "/login?role=admin  ·  password from .env" },
      { k: "Extension", v: "/extension  ·  or chrome://extensions load unpacked" },
      { k: "Verify", v: "npm test  ·  npm run typecheck  ·  npm run test:api  ·  npm run test:testnet" },
    ];
    links.forEach((row, i) => {
      const y = 1.4 + i * 0.7;
      s.addText(row.k, {
        x: 0.55,
        y,
        w: 2.4,
        h: 0.55,
        fontSize: 15,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.mint,
        valign: "middle",
        margin: 0,
      });
      s.addText(row.v, {
        x: 3.05,
        y,
        w: 9.7,
        h: 0.55,
        fontSize: 15,
        fontFace: "Arial",
        color: C.white,
        valign: "middle",
        margin: 0,
      });
    });

    s.addNotes(
      "Jüri kurulumu README'de. APP_ORIGIN tam olarak http://localhost:3000 olmalı. MAINNET_RECEIVER boşsa teklif/ödeme yapılandırma hatası verir. Otomatik test ≠ gerçek ödeme."
    );
  }

  // ============================================================
  // 14. CLOSE
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: C.bg };
    s.addImage({
      path: A("logo-icon.png"),
      x: 0.55,
      y: 0.55,
      w: 0.42,
      h: 0.4,
    });
    s.addImage({
      path: A("logo-wordmark.png"),
      x: 1.05,
      y: 0.58,
      w: 2.15,
      h: 0.335,
    });

    s.addText("Spend freely.", {
      x: 0.55,
      y: 1.8,
      w: 12.2,
      h: 0.8,
      fontSize: 44,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.white,
      margin: 0,
    });
    s.addText("Settle simply.", {
      x: 0.55,
      y: 2.55,
      w: 12.2,
      h: 0.8,
      fontSize: 44,
      fontFace: "Trebuchet MS",
      bold: true,
      color: C.mint,
      margin: 0,
    });
    s.addText(
      "Stellar already moves the dollar. SP3ND spends it at a Turkish door.",
      {
        x: 0.55,
        y: 3.5,
        w: 11,
        h: 0.5,
        fontSize: 18,
        fontFace: "Arial",
        color: C.gray,
        margin: 0,
      }
    );

    const close = [
      { t: "Repo", d: "github.com/HDemir23/SP3ND" },
      { t: "Site", d: "sp3nd.shop" },
      { t: "Next", d: "SCF  ·  Anchor  ·  escrow" },
    ];
    close.forEach((c, i) => {
      const x = 0.55 + i * 4.15;
      card(s, x, 4.4, 3.95, 1.55, C.mint);
      s.addText(c.t, {
        x: x + 0.22,
        y: 4.58,
        w: 3.5,
        h: 0.3,
        fontSize: 12,
        fontFace: "Arial",
        bold: true,
        color: C.mint,
        charSpacing: 1.4,
        margin: 0,
      });
      s.addText(c.d, {
        x: x + 0.22,
        y: 4.95,
        w: 3.5,
        h: 0.7,
        fontSize: 16,
        fontFace: "Trebuchet MS",
        bold: true,
        color: C.white,
        margin: 0,
      });
    });

    s.addText("Thank you  ·  questions", {
      x: 0.55,
      y: 6.3,
      w: 12.2,
      h: 0.4,
      fontSize: 16,
      fontFace: "Arial",
      color: C.grayDark,
      margin: 0,
    });

    s.addNotes(
      "Kapanış: Stellar doları taşıyor, SP3ND onu kapıya götürüyor. Sorular. Demo’ya geç."
    );
  }

  const out = path.join(__dirname, "SP3ND-Stellar-Pro-Hackathon.pptx");
  await pres.writeFile({ fileName: out });
  console.log("Wrote", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
