# LUM3ND testnet MVP

## Tek komutla gerçek testnet kabul testi

```sh
npm run test:testnet
```

Stellar Friendbot ve Horizon erişimi gerekir. Port 3100 boş olmalıdır. Script üç yeni test hesabı oluşturur; özel demo issuer'ından `USDC` kodlu, parasal değeri olmayan test tokenı basar. Bu token Circle USDC değildir. Yalnızca `Networks.TESTNET` kullanılır.

Uygulamanın HTTP API'leri üzerinden cüzdan imzasıyla giriş, Amazon ürün linkini manuel teklif için sepete ekleme, teslimat adresi, teklif oluşturma, ödeme hazırlama/imzalama/gönderme, zincir doğrulaması ve mağaza kaydı çalıştırılır. Ödeme öncesi satın alma kaydı reddedilmeli; aynı ödeme tekrar gönderildiğinde ikinci tahsilat olmamalıdır.

Demo hesabı: **40 TRY ürün / 40 USDTRY + 1 USDC hizmet = 2 test USDC**. Fiyat ve kur kontrollü test verisidir; güncel Amazon fiyatı değildir. Varsayılan ürün bağlantısı örnektir. Gerçek ürün bağlantısıyla çalıştırmak için:

```sh
TEST_PRODUCT_URL='https://www.amazon.com.tr/dp/URUN_ASINI' npm run test:testnet
```

`/s?k=...` arama sayfası kabul edilmez; ürünün tam `/dp/...` bağlantısı gerekir. Amazon otomatik fiyat vermediğinde arayüz **Fiyatsız sepete ekle** seçeneği sunar; kesin fiyat ödeme öncesinde admin teklifinde belirlenir.

## Ekranda inceleme

```sh
npm run dev:testnet
```

- Uygulama: http://localhost:3100
- Admin: http://localhost:3100/login?role=admin — parola `.env.testnet` dosyasındaki `ADMIN_PASSWORD`.
- Freighter'a yalnızca test için üretilen `.env.testnet-wallets` içindeki `TEST_PAYER_SECRET` hesabını aktar ve Testnet seç. Bu dosya uygulamaya yüklenmez ve Git tarafından yok sayılır.
- Ödeme alan test hesabı ve issuer `.env.testnet` içinde herkese açık adreslerdir.
- Rapor: `output/testnet/latest.json`; işlem hash'i, explorer bağlantısı, alıcı bakiyesi ve sipariş durumu bulunur.
- Her çalıştırma `output/testnet/<zaman>/demo.db` altında ayrı veritabanı kullanır. Normal `.env` ve mevcut sipariş veritabanı değiştirilmez.

Otomatik test SDK ile imza atar; Freighter eklentisinin arayüzü manuel kabul adımıdır. Satın alma ve kargo referansları `DEMO` olarak kaydedilir; Amazon hesabına giriş yapılmaz, kart kullanılmaz, gerçek gönderim oluşturulmaz.

Testnet hesapları ağ sıfırlamalarında silinebilir; yeniden kurmak için kabul testini tekrar çalıştır. Kaynak: https://developers.stellar.org/docs/networks
