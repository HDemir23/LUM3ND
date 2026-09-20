# LUM3ND

**Türkiye’deki mağazalardan tek sepet, Stellar üzerinde tek USDC ödemesi.**

LUM3ND; Amazon Türkiye, Trendyol ve Hepsiburada ürün bağlantılarını cüzdana bağlı bir sepette toplar. Kullanıcı teslimat adresini paylaşır, hazırlanan teklifi inceler ve Freighter ile ödeme imzalar. Ödeme zincirde doğrulandıktan sonra operatör ürünleri mağazalardan satın alır ve kargo bilgilerini siparişe ekler.

Mağazanın USDC kabul etmesi gerekmez: kullanıcı operatöre USDC öder, operatör mağaza satın almasını manuel tamamlar.

[Demo rehberi](DEMO.md) · [Sunum PDF](pitch/SP3ND-Stellar-Pro-Hackathon.pdf) · [Sunum PowerPoint](pitch/SP3ND-Stellar-Pro-Hackathon.pptx)

> **MVP kapsamı:** Masaüstü Chrome + Freighter, Türkiye içi teslimat ve operatör destekli satın alma. Ödeme klasik Stellar işlemleriyle yapılır; escrow veya Soroban kontratı kullanılmaz.

## Neler yapabilirsiniz?

| Özellik | Mevcut davranış |
| --- | --- |
| Cüzdanla giriş | Freighter üzerinden tek kullanımlık mesaj imzası |
| Kalıcı sepet | Üç mağazanın ürünleri, adet ve seçenek notları aynı sepette |
| Amazon ürün önizlemesi | Ürün adı, görsel, TRY fiyatı ve TCMB kuruyla USD karşılığı |
| Manuel teklif | Fiyat alınamayan ürünlerde ve diğer mağazalarda admin fiyatlandırması |
| Tek ödeme | Ürünler, mağaza kargoları ve hizmet bedeli için tek USDC işlemi |
| Mağaza bazında takip | Ayrı satın alma referansları, kargo bilgileri ve kısmi ilerleme durumları |
| Tam iade | İade işleminin hash üzerinden zincirden doğrulanması |
| Chrome extension | Açık ürün bağlantısını uygulamaya taşıyan Manifest V3 paketi |
| Testnet demosu | Ayrı hesaplar ve veritabanıyla gerçek testnet üzerinde kabul senaryosu |

## Alışveriş akışı

1. **Cüzdanını bağla.** Freighter’da giriş mesajını imzala. Giriş imzası ödeme göndermez.
2. **Ürünleri ekle.** Tam ürün bağlantısını yapıştır; adet ve renk/beden gibi seçenek notlarını belirt. Amazon’da **Ürünü getir** ile önizlemeyi açıp **Sepete ekle** ile onayla.
3. **Teslimat adresini gir.** Alıcı adı, telefon, il, ilçe, açık adres ve beş haneli posta koduyla teklif iste.
4. **Teklifi incele.** Admin ürün fiyatlarını, stok durumunu, mağaza kargolarını ve kuru doğrular. Teklif **15 dakika** geçerlidir.
5. **USDC ile öde.** Freighter’da işlemi kontrol edip imzala. Sipariş ancak ödeme zincirde doğrulandığında **Ödendi** durumuna geçer.
6. **Siparişi takip et.** Admin her mağazanın satın alma referansını ve kargo bilgisini ekler; kullanıcı ilerlemeyi kendi sipariş ekranında görür.

Sepet sayfa yenilendiğinde korunur. Aynı URL ve seçenek notu tekrar eklendiğinde adet artar. Bir satır en fazla **20 adet**, sepet en fazla **100 satır** içerir. Adedi `0` yapmak satırı kaldırır.

## Hızlı başlangıç

Gereksinimler: **Node.js 24**, npm, masaüstü Chrome ve Freighter.

```sh
npm ci
npm run setup
npm run dev
```

Uygulama **http://localhost:3000** adresinde açılır.

`setup`, mevcut `.env` dosyasını korur. İlk kurulumda `.env.example` üzerinden yapılandırma oluşturur ve rastgele bir admin parolası üretir. Prisma istemcisini oluşturur; şemayı uygulamadan önce mevcut SQLite veritabanını yedekler.

| Sayfa | İşlev |
| --- | --- |
| `/` | Ürün ekleme, sepet ve teklif talebi |
| `/login` | Freighter ile kullanıcı girişi |
| `/orders` | Giriş yapan cüzdanın siparişleri |
| `/orders/[id]` | Teklif, ödeme ve teslimat takibi |
| `/login?role=admin` | `ADMIN_PASSWORD` ile admin girişi |
| `/admin` | Teklif hazırlama, ödeme kontrolü, satın alma, kargo ve iade |
| `/extension` | Extension indirme ve kurulum yönergeleri |

Sunucuyu durdurmak için çalıştığı terminalde `Ctrl+C` kullanın. Üretim derlemesini yerelde açmak için:

```sh
npm run build
npm start
```

### Ortam değişkenleri

Örnek değerler [.env.example](.env.example) dosyasındadır. Varsayılan ağ **testnet**’tir; mevcut `.env` dosyanızın ağ seçimi kurulum sırasında değiştirilmez.

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | SQLite konumu; varsayılan `file:./demo.db` |
| `APP_ORIGIN` | Uygulamanın tam origin’i; normal geliştirmede `http://localhost:3000` |
| `ADMIN_PASSWORD` | Kurulumun ürettiği admin parolası |
| `STELLAR_NETWORK` | `testnet` veya `mainnet` |
| `TESTNET_RECEIVER` | Testnet ödeme alıcısının herkese açık `G…` adresi |
| `TESTNET_USDC_ISSUER` | Testnet’te kullanılacak varlığın issuer adresi |
| `MAINNET_RECEIVER` | Mainnet ödeme alıcısının herkese açık `G…` adresi |
| `MAINNET_USDC_ISSUER` | Mainnet USDC issuer adresi |
| `RAINFOREST_API_KEY` | İsteğe bağlı Amazon ürün verisi sağlayıcısı anahtarı; yalnızca sunucuda kullanılır |

Seçilen ağın alıcı adresi yapılandırılmadan teklif ve ödeme hazırlığı tamamlanamaz. Gönderen ile alıcı farklı hesaplar olmalı; ilgili varlık için trustline ve gönderende ödeme/ağ ücretini karşılayacak bakiye bulunmalıdır.

**Port ve origin aynı olmalı.** `localhost` ile `127.0.0.1` farklı origin’lerdir. Normal geliştirme portunu değiştirmek için örneğin `npm run dev -- --port 3001` kullanırken `APP_ORIGIN` değerini de `http://localhost:3001` yapın. Extension kullanıyorsanız onun origin’ini de güncelleyin.

## Fiyatlandırma

### Amazon önizlemesi

Amazon Türkiye ürün bağlantısından başlık, görsel ve TRY fiyatı alınır. USD karşılığı, TCMB’nin son yayımlanan USD döviz satış kuruyla hesaplanır. **Her adet için 1 USD hizmet bedeli** eklenir.

| Örnek hesap | Tutar |
| --- | ---: |
| Ürünün birim fiyatı | 400 TRY |
| Örnek USD/TRY kuru | 40 |
| USD karşılığı | 10 USD |
| Adet başına hizmet bedeli | 1 USD |
| Bir adet için tahmini tutar | **11 USD** |
| İki adet için tahmini tutar | **22 USD** |

Bu tablodaki fiyat ve kur örnektir. Sepet tutarı **kargo hariç bir tahmindir**; ödeme yapılacak kesin tutar admin teklifinde belirlenir. Önizlemede kur ve bülten tarihi gösterilir. Ürün bilgisi en fazla beş dakika önbelleklenir; kur alınamazsa veya bülten yedi günden eskiyse otomatik fiyat oluşturulmaz.

Amazon otomatik isteklere zaman zaman doğrulama sayfası döndürebilir. Bu durumda kullanıcı **Fiyatsız sepete ekle** ile manuel teklif talebine devam edebilir. Bu yol tarayıcıdan fiyat kabul etmez ve admin teklifi olmadan ödeme başlatmaz. İsteğe bağlı `RAINFOREST_API_KEY` yapılandırıldığında ürün verisi bu sağlayıcı üzerinden alınır; değişiklikten sonra sunucuyu yeniden başlatın.

Trendyol ve Hepsiburada ürünleri manuel teklif akışını kullanır. Kısa linkler ve arama sayfaları yerine tam HTTPS ürün bağlantıları gerekir; takip parametreleri temizlenir.

### Kesin teklif

```text
Ürünler TRY = Σ(birim fiyat × adet)
Hizmet bedeli USDC = toplam adet × 1
Toplam USDC = (ürünler TRY + mağaza kargoları TRY) / USDTRY + hizmet bedeli USDC
```

Hesaplama sunucuda `Decimal` ile yapılır; ödeme tutarı yedi ondalığa yukarı yuvarlanır. Önizleme iki ondalık gösterdiği için kesin teklifle küçük yuvarlama farkları olabilir. Fiyatlandırma **1 USDC = 1 USD** varsayımını kullanır. Sepet teklifinde istemcinin gönderdiği farklı bir hizmet bedeli, adet başına 1 USDC kuralını değiştirmez.

Stok veya fiyat sorunu ödeme öncesinde yeni teklifle çözülür. Aktif ödeme denemesi varken teklif değiştirilemez. Ödeme sonrasında otomatik ek tahsilat yapılmaz.

## Ödeme, satın alma ve iade

Sunucu ödeme işlemini XDR olarak hazırlar; kullanıcı Freighter ile imzalar. Doğrulamada ağ, işlem hash’i, gönderen, alıcı, varlık/issuer, tutar, memo, zaman sınırları ve işlem başarısı kontrol edilir.

Bekleyen ödeme kullanıcı ve admin ekranlarında sorgulanır. Yenileme veya ağ gecikmesi yeni tahsilat başlatmak yerine mevcut ödeme denemesini izler. İmza reddedildiğinde geçerli deneme yeniden imzalanabilir. Süresi dolan belirsiz bir deneme, zincir kontrolü tamamlanmadan serbest bırakılmaz.

Ödeme doğrulandıktan sonra admin mağazalarda kendi hesabı ve ödeme yöntemiyle satın alma yapar. Her mağazanın referansı ve kargo bilgisi ayrı tutulur.

| Durum | Kullanıcıya gösterilen anlam |
| --- | --- |
| `REQUESTED` | Teklif bekliyor |
| `QUOTED` | Ödeme bekliyor |
| `PAID` | Ödeme zincirde doğrulandı |
| `PARTIALLY_PURCHASED` | Bazı mağazalardan satın alındı |
| `PURCHASED` | Tüm mağazalardan satın alındı |
| `PARTIALLY_SHIPPED` | Bazı mağazaların siparişleri kargolandı |
| `SHIPPED` | Tüm mağazaların siparişleri kargolandı |
| `CANCELLED` | İptal edildi |
| `REFUND_PENDING` | İade bekliyor |
| `REFUNDED` | Tam iade zincirde doğrulandı |

Tam iadede admin önce iade sürecini başlatır. Ödemeyi alan cüzdandan kullanıcıya, siparişin **tam USDC tutarı** ve `R` + sipariş memo’suyla transfer yapar; hash’i admin paneline girer. Uygulama iade işlemini zincirden doğrular. **Kısmi iade ve ağ ücreti iadesi bu sürümde yoktur.**

## Chrome extension

Extension bir **Manifest V3** paketidir. Açık ürün sayfasının URL’sini uygulamanın `/?url=…` ekranına taşır. Giriş gerekiyorsa bağlantı giriş sonrasında korunur; kullanıcı ürünü onaylayıp sepete ekler.

1. Uygulamadaki `/extension` sayfasından ZIP paketini indirip klasöre çıkarın; alternatif olarak repodaki `extension/` klasörünü kullanın.
2. Chrome’da `chrome://extensions` sayfasını açın ve **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile klasörü seçin.
4. Desteklenen mağazada bir ürün sayfası açıp extension düğmesini kullanın.

Yalnızca `activeTab` izni istenir; extension cüzdan anahtarı veya oturum bilgisi saklamaz. Chrome Web Store yayını bu sürüme dahil değildir.

Varsayılan hedef `http://localhost:3000`’dir. **3100 portundaki testnet demosunda** kullanmak için [extension/popup.js](extension/popup.js) içindeki `APP_ORIGIN` değerini `http://localhost:3100` yapıp Chrome’da extension’ı yeniden yükleyin. İndirilebilir paketi yenilemek için:

```sh
npm run extension:pack
```

Çıktı: `public/lum3nd-extension.zip`. Normal uygulamaya dönerken origin’i tekrar 3000’e alın.

## Mimari ve veri modeli

| Katman | Teknoloji / sorumluluk |
| --- | --- |
| Web ve API | Next.js App Router, React, TypeScript |
| Veritabanı | SQLite ve Prisma |
| Girdi ve tutar doğrulama | Zod ve Decimal.js |
| Cüzdan ve ödeme | Freighter, Stellar SDK ve Horizon |
| Ürün ve kur | Amazon HTML / isteğe bağlı Rainforest, TCMB |
| Tarayıcı eklentisi | Chrome Manifest V3 |

Başlıca modeller [prisma/schema.prisma](prisma/schema.prisma) içinde tanımlıdır:

- `User`, `Session`, `LoginChallenge`: cüzdan kimliği, oturum ve tek kullanımlık giriş doğrulaması.
- `CartItem`: cüzdana bağlı kalıcı sepet ve ürün önizleme bilgileri.
- `Order`, `OrderItem`, `OrderAddress`: ana sipariş, ürün satırları ve teslimat adresi.
- `MerchantOrder`: mağaza kargosu, satın alma referansı ve gönderim bilgisi.
- `Attempt`: ana siparişe bağlı ödeme denemesi, XDR ve işlem hash’i.

Sepetten sipariş oluşturma, adresi kaydetme ve sepeti boşaltma tek veritabanı işlemiyle yapılır. Cüzdana bağlı idempotency anahtarı aynı talebin tekrarında aynı siparişi döndürür.

### Erişim ve kayıtların korunması

Kullanıcı yalnızca kendi cüzdanına bağlı sepet, adres ve siparişlere erişebilir. Giriş challenge’ı beş dakika, oturum sekiz saat geçerlidir. Süresi dolan veya kullanılmış giriş imzası reddedilir; cüzdan hesabı değiştiğinde yeniden giriş gerekir.

Eski siparişler ve ödeme kayıtları korunur. Sahipliği bilinmeyen eski siparişler yalnızca admin tarafından görüntülenir. Şema güncellemesi için:

```sh
npm run db:push
```

Bu komut önce mevcut SQLite dosyasının yanına `.db.backup-<tarih>` yedeği alır. Yalnızca yedek almak için `npm run db:backup` kullanılabilir. Şema değişikliğinden sonra çalışan sunucuyu yeniden başlatın.

Uygulama gerçek cüzdan özel anahtarını, kart bilgilerini veya mağaza parolalarını istemez. Teslimat adresi veritabanında saklanır. Testnet kabul script’inin ürettiği test anahtarları ayrı, Git tarafından yok sayılan bir dosyadadır ve uygulamaya yüklenmez.

### API özeti

Tüm yollar `/api` önekiyle kullanılır. Kullanıcı ve admin işlemleri ilgili oturumla korunur; POST isteklerinde `Origin`, `APP_ORIGIN` ile eşleşmelidir.

| Yöntem ve yol | İşlev |
| --- | --- |
| `POST /auth/challenge`, `POST /auth/verify` | Giriş mesajı oluşturma ve imza doğrulama |
| `GET /auth/session` | Kullanıcı oturumunu sorgulama |
| `POST /auth/login`, `POST /auth/logout` | Admin girişi ve rol bazında çıkış |
| `POST /products` | Amazon ürün önizlemesi |
| `GET /cart`, `POST /cart` | Sepeti okuma ve ürün ekleme |
| `POST /cart/:id` | Adet değiştirme; `0` ile satır kaldırma |
| `GET /orders`, `GET /orders/:id` | Cüzdanın siparişleri ve sipariş detayı |
| `POST /orders` | Sepet, adres ve idempotency anahtarıyla sipariş oluşturma |
| `POST /orders/:id/prepare`, `/submit`, `/verify` | Ödeme hazırlama, imzalı işlemi gönderme ve doğrulama |
| `POST /orders/:id/cancel` | İzin verilen durumda iptal |
| `GET /admin`, `GET /admin/:id` | Admin sipariş listesi ve detay |
| `POST /admin/:id/quote` | Ürün fiyatları, mağaza kargoları ve kurla teklif hazırlama |
| `POST /admin/:id/fulfill` | Mağazaya satın alma referansı ve kargo bilgisi ekleme |
| `POST /admin/:id/status`, `/verify`, `/refund` | Durum işlemleri, ödeme ve tam iade doğrulaması |

Uygulama kodu: [API](app/api/[...path]/route.ts), [sepet](lib/cart.ts), [ürün bilgisi](lib/products.ts), [siparişler](lib/orders.ts), [Stellar işlemleri](lib/stellar.ts).

## Testler ve demo

### Yerel kontroller

```sh
npm test
npm run typecheck
npm run build

# Normal yerel sunucu açıkken (.env / APP_ORIGIN):
npm run test:api
```

Birim ve entegrasyon testleri; cüzdan ayrımı, giriş imzası, kalıcı sepet, fiyat hesabı, ödeme tekrarı, yanlış işlem bilgileri, süre aşımı, mağaza bazında ilerleme ve tam iade senaryolarını kapsar. Geçici SQLite veritabanı ve taklit ağ yanıtları kullanılır. API kontrolü test cüzdanlarıyla oturum açar, erişim ayrımını kontrol eder ve oluşturduğu kayıtları temizler; gerçek fon göndermez.

İlk üretim derlemesinde `next/font` için ağ erişimi gerekebilir.

### Gerçek testnet kabul senaryosu

Bağımlılıklar ve Prisma istemcisi kurulduktan sonra:

```sh
npm run test:testnet
npm run dev:testnet
```

İlk komut Friendbot ve Horizon kullanarak test hesapları oluşturur, uygulamanın HTTP API’leri üzerinden **2 test USDC** öder, zincir doğrulamasını ve demo mağaza kayıtlarını kontrol eder. İkinci komut oluşan demoyu **http://localhost:3100** adresinde açar. Kabul testini yeniden çalıştırmadan önce bu porttaki demo sunucusunu kapatın.

Bu token özel bir demo issuer’ına aittir; **Circle USDC değildir ve parasal değeri yoktur**. Script SDK ile imzalar; Freighter arayüzünü, gerçek mağaza satın almasını veya kargoyu doğrulamaz.

| Demo çıktısı | İçerik |
| --- | --- |
| `.env.testnet` | Demo yapılandırması ve admin parolası |
| `.env.testnet-wallets` | Yalnızca test için üretilen cüzdan anahtarları |
| `output/testnet/latest.json` | Son kabul çalışmasının raporu ve işlem bağlantısı |
| `output/testnet/<zaman>/demo.db` | Çalıştırmaya özel SQLite veritabanı |

Normal `.env` ve sipariş veritabanı değiştirilmez. Freighter ile demoyu açma adımları [DEMO.md](DEMO.md) içindedir.

### Mainnet için manuel kabul

Mainnet kabulü, otomatik testlerin geçmesinden ayrı bir adımdır. Operatörün ve ödeme yapacak kullanıcının aşağıdaki akışı tamamlaması gerekir:

- [ ] `STELLAR_NETWORK=mainnet` ve `MAINNET_RECEIVER` yapılandırılır; doğru issuer, trustline ve bakiyeler kontrol edilir.
- [ ] Kullanıcı gerçek Freighter cüzdanıyla giriş mesajını imzalar.
- [ ] Düşük tutarlı sipariş teklifini inceler ve ödemeyi Freighter’da imzalar.
- [ ] İşlem hash’i zincirde doğrulanır; sipariş **Ödendi** görünür.
- [ ] Operatör mağazadan gerçek satın alma yapar ve gerçek sipariş referansını kaydeder.
- [ ] Extension’dan taşınan ürün için de kullanıcı onayı ve ödeme akışı doğrulanır.

Bu liste tamamlanmış mainnet kabulü iddiası değildir; uygulanacak kabul ölçütlerini belirtir.

## Kapsam dışında

Otomatik kartla satın alma, mobil cüzdan akışı, escrow, özel akıllı kontrat/Soroban, SEP-6 Anchor, kısmi iade ve Chrome Web Store yayını bu sürümde bulunmaz. Otomatik ürün fiyatı önizlemesi Amazon Türkiye ile sınırlıdır; kesin fiyatlandırma ve mağaza satın alması operatör tarafından tamamlanır.
