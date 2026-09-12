# Fincan — QR Kafe Menü

Türkçe, çok kafeli QR menü uygulaması. React 19 + Vinext, Cloudflare Workers ve D1.

## Çalışan özellikler

- Hesaba bağlı, uygulama seviyesinde sayı sınırı olmayan kafe oluşturma.
- Sabit `/{kafe-slug}` menü adresi, yerel üretilen indirilebilir PNG QR.
- Ürün ekleme, düzenleme, tekil silme, sıralama, kategori ve görünürlük.
- Canlı menü üstünden ürün düzenleme; üç tasarım, vurgu/arka plan/metin renkleri, başlık fontu, yazı boyutu ve marka imzası kontrolü.
- Taslak/yayın kontrolü; QR bağlantısı güncellemelerde değişmez.
- ECB verilerini Frankfurter üzerinden alan TRY → USD/EUR dönüşümü. Altı saatlik ortak D1 önbelleği, kaynak tarihi ve kesintide son bilinen kur uyarısı. Anlık ticari kur değil, günlük referans kurudur.
- Günlük tekil tarayıcı ziyaretleri, saat dağılımı, kafe ve dönem filtresi. Dönem toplamı günlük tekillerin toplamıdır; farklı günler arasında tekil kişi sayısı değildir.
- Tesseract.js ile tarayıcı içinde Türkçe/İngilizce fotoğraf OCR, satır bazlı ürün/fiyat ayrıştırma ve düzenlenebilir onay listesi. Ücretli generatif AI entegrasyonu yoktur.

## Yerelde çalıştırma

Node 22.13+ gereklidir.

```sh
npm ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fat_the_hunter.sql
npm run dev
```

İlk yerel migration yalnızca boş veritabanına bir kez uygulanır. Uygulama `http://localhost:5173` adresinde çalışır. Yerel giriş simülatörü yalnızca loopback geliştirme ortamındadır; üretimde Sites tarafından doğrulanan kimlik kullanılır. `npm` Windows komut dosyası hatası verirse `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"` ile npm komutunu çalıştırabilirsiniz.

`node node_modules/typescript/bin/tsc --noEmit` tip kontrolünü yapar. Yerel arayüzde adı `Mola Coffee · Test`, slug'ı `mola-coffee-test` olan bir kafe oluşturulduktan sonra `node scripts/smoke-test.mjs` temel güvenlik, kayıt, yayın, kur ve ziyaret tekilleştirme kontrollerini çalıştırır. Bu test yalnızca yerel test kafesini yayınlar.

## Maliyet

QR, OCR ve Frankfurter için işlem başına ücret yoktur. Tarama motoru ve dil modelleri ilk taramada CDN üzerinden indirilir; fotoğraf cihazda işlenir. OCR kusursuz değildir, özellikle çok sütunlu/fiyatı ayrı hizalanmış menülerde düzeltme gerekebilir. Fiyatlar aktarılmadan önce kontrol edilir.

Cloudflare'ın ücretsiz katmanları düşük trafik için uygundur; Sites barındırması kendi erişim ve plan koşullarına tabidir. Ücretsiz katmanların aşılmayacağı veya platformun ücretsiz kalacağı garanti edilmez. Özel alan adı ayrıca satın alınır/bağlanır. Kaynaklar: [Workers fiyatlandırması](https://developers.cloudflare.com/workers/platform/pricing/), [D1 fiyatlandırması](https://developers.cloudflare.com/d1/platform/pricing/), [Frankfurter](https://frankfurter.dev/).

## Yayın ve sınırlar

Sites kimliği `.openai/hosting.json` içindedir. D1 migration'ları `drizzle/` ile sürümlenir. Gerçek müşteri menülerine anonim erişim için Site erişim politikasının herkese açık olması gerekir; ilk dağıtım yalnızca sahibine özeldir. Yönetim işlemlerinde kimlik, kayıt sahipliği, şema ve aynı kaynak kontrolü sunucuda uygulanır. Kimlik başlıklarına yalnızca Sites'ın güvenilir dispatcher'ı arkasında güvenilir; uygulama internete doğrudan farklı bir sunucudan açılacaksa gerçek kimlik doğrulama eklenmelidir.

Özel alan adı bağlı değildir. E-posta/şifreli bağımsız SaaS hesabı, ödeme/abonelik, gelişmiş generatif AI ve serbest sürükle-bırak sayfa tasarımcısı bu sürümde yoktur. Başlangıç tasarımı temalar ve görünüm ayarlarıyla özelleştirilir. Ziyaretler yaklaşık ölçümdür: tarayıcı verisini silme, botlar ve farklı cihazlar sayıları etkileyebilir. Üretimde yüksek trafik için ziyaret uç noktasına platform hız sınırı ve periyodik eski kayıt temizliği eklenmelidir.
