# Fincan — QR Kafe Menü

Türkçe QR menü uygulaması. React 19 + Vinext, Cloudflare Workers ve kalıcı D1 veritabanı.

## İşlevler

- E-posta/şifre ile hesap oluşturma, giriş ve çıkış. Her kullanıcı yalnızca kendi kafelerini yönetir. Yönetim API'leri ve `/editor/:id` adresi sunucuda oturum ve sahiplik kontrolü yapar.
- Kafelerim: kafe oluşturma, ad/konum düzenleme, sabit bağlantı ve PNG QR indirme.
- Menü yönetimi: her kafenin ürün/kategori özeti, yayın durumu ve ayrı editöre geçiş.
- Tam ekran menü stüdyosu: ortada gerçek önizleme, solda bloklar, sağda seçilen başlık/kategori/ürünün ayarları. Kategori yeniden adlandırma/sıralama, ürün ekleme/düzenleme/silme, görünürlük ve kategori içi sıra.
- Üç tema; vurgu/arka plan/metin renkleri, başlık fontu ve yazı boyutu. Fincan watermark'ı her zaman görünür; kapatma ayarı yoktur, eski `showBranding:false` kayıtları da imzayı gizlemez.
- Yönetim ekranları, kayıt/giriş ve editörde açık/koyu tema. Tercih cihazda saklanır; ilk açılışta sistem teması izlenir. Panel teması müşterinin menü tasarımını değiştirmez.
- Sabit `/{kafe-slug}` adresi; QR kod fiyat veya tasarım değişiminde aynı kalır.
- ECB / Frankfurter günlük referans kurlarıyla TRY → USD/EUR dönüşümü. Ortak altı saatlik D1 önbelleği, kaynak tarihi, kesintide son bilinen kur uyarısı. Ödemeler TL olarak alınır.
- Günlük tekil tarayıcı ziyaretleri, saat dağılımı ve kafe/dönem filtresi. Dönem sayısı günlük tekillerin toplamıdır.
- Tarayıcıda Tesseract.js Türkçe/İngilizce fotoğraf OCR; ürün/fiyat ayrıştırma ve onay listesi. Fotoğraf ücretli AI servisine gönderilmez. Çok sütunlu veya karmaşık menülerde manuel düzeltme gerekebilir.

## Yerelde çalıştırma

Node 22.13+ gereklidir.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fat_the_hunter.sql
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_lyrical_odin.sql
npm run dev
```

Migration'lar sırayla, bir kez uygulanır. Eski prototip veritabanı varsa yalnızca yeni `0001` dosyasını uygulayın. `http://localhost:5173/login` adresinden kendi hesabınızı oluşturun. Önceki Sites kimliğiyle halen doğrulanmış kullanıcının eski kafeleri, ilk kayıt sırasında aynı kimlikten yeni hesaba taşınır; doğrulanmış eski kimlik olmadan aktarım yapılmaz.

Windows npm shim sorunu olursa `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"` ile npm komutunu çalıştırabilirsiniz.

## Doğrulama

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js app lib db
node scripts/account-smoke.mjs
```

Son komut **yalnızca localhost üzerinde** iki `.invalid` test hesabı ve test kafesi oluşturur; kayıt/giriş, güvenli çerez nitelikleri, hesap izolasyonu, editör yetkisi, geçersiz şifre, negatif fiyat, kaynak kontrolü, kalıcı watermark ve çıkışta oturum iptalini test eder. Test hesapları üretim veritabanına taşınmaz. Test şifresi gerçek kullanım için uygun değildir.

## Kimlik doğrulama

Şifreler rastgele tuzla scrypt (N=32768, r=8, p=3) kullanılarak hashlenir. Oturumlar 256 bit rastgele belirteçlerle oluşturulur; veritabanında yalnızca SHA-256 özetleri tutulur. Çerezler HttpOnly, SameSite=Lax; HTTPS'te Secure ve `__Host-` öneki kullanır. Oturum 14 gün geçerlidir; çıkış sunucu kaydını siler. Giriş/kayıt denemeleri e-posta ve IP bazında veritabanında sınırlandırılır. Parola en az 12, en fazla 128 karakterdir.

E-posta doğrulama ve e-posta ile parola sıfırlama bu sürümde yoktur; gerçek bir e-posta gönderim servisi gerektirir. Giriş için ChatGPT hesabı gerekmez. Sites'ın dış erişim politikası, uygulamanın kendi hesabından ayrı bir katmandır; ilk yayın sahibiyle sınırlıysa dış ziyaretçiler Site'a erişemez.

## Maliyet ve yayın

QR üretimi, fotoğraf OCR ve Frankfurter verisi işlem başına ücret gerektirmez. Tarama motoru ve dil dosyaları ilk kullanımda CDN'den indirilir; görüntü cihazda işlenir. Kalıcı veriler D1'de tutulur; özel bir sürekli çalışan sunucu yoktur.

Cloudflare ücretsiz katmanı düşük trafiğe uygundur ancak özellikle güvenli parola hashleme CPU tüketir. Gerçek barındırma/Sites planı ve trafik limitleri kontrol edilmelidir; sıfır fatura garantisi verilmez. Özel alan adı ayrıca satın alınır/bağlanır ve henüz bağlı değildir. Referanslar: [Workers fiyatları](https://developers.cloudflare.com/workers/platform/pricing/), [D1 fiyatları](https://developers.cloudflare.com/d1/platform/pricing/), [Frankfurter](https://frankfurter.dev/), [OWASP parola saklama](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Site kimliği `.openai/hosting.json` içindedir. Migration dosyaları `drizzle/` altında sürümlenir. Müşterilerin anonim menü erişimi için Site'ın erişim politikasının herkese açık olarak ayarlanması gerekir. Abonelik/ödeme ve generatif AI entegrasyonu yoktur. Ziyaretler yaklaşık ölçümdür; farklı cihazlar, veri temizleme ve botlar sayıları etkileyebilir.

## Kafe logosu ve önerilen palet

Editörde Başlık bloğundan PNG, JPG veya WebP logo seçilebilir (en fazla 5 MB). Görsel tarayıcıda en fazla 256 piksele küçültülür, sıkıştırılır ve en fazla 120.000 karakterlik bir veri URL'si olarak mevcut kafe kaydıyla D1'e kaydedilir. Ek depolama veya AI servisi kullanılmaz. Kaydetmeden ziyaretçi menüsü değişmez; geri alma logo ve paleti de geri alır.

Şeffaf ve beyaza yakın arka planlar renk analizinden çıkarılır. Baskın renkten okunabilir vurgu, açık arka plan ve koyu metin rengi oluşturularak otomatik uygulanır. Genel görünümde elle değiştirilebilir veya önerilen palet yeniden uygulanabilir. Varsayılan simgeye dönüş renkleri korur; zorunlu Fincan watermark'ını etkilemez.

`node scripts/logo-test.mjs` renk analizi ve kontrastı doğrular. Hesap testi ayrıca logonun kaydedilmesini, ziyaretçi sayfasında görünmesini ve desteklenmeyen/aşırı büyük logo verilerinin reddini kontrol eder.
