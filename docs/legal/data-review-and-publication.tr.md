# Fincan — Veri incelemesi ve yayımlama notları

**İnceleme tarihi:** 10 Ekim 2026  
**Kapsam:** Bu çalışma alanındaki uygulama kodu, veritabanı migration dosyaları ve dağıtım yapılandırması. Canlı Supabase/Google/Cloudflare yönetim panelleri ve canlı veritabanı incelenmemiştir. Metinler canlı yapılandırmanın doğrulandığı iddiasını taşımaz.

Hizmet sağlayıcı adı kullanıcı tarafından **Hibrit**, ürün adı **Fincan**, canlı alan adı **fincan.hibrit.dev** olarak bildirildi. Henüz açılmamış `info@hibrit.com` veya `support@hibrit.com` adresleri gerçek iletişim kanalı gibi kullanılmadı. İletişim satırı kullanıcının isteğiyle boş bırakıldı. Hazırlanan dosyalar doğrudan kullanılabilecek metin ve HTML çıktılarıdır; boş iletişim alanı ile aşağıdaki canlı ayar ve işletim konuları çözülmeden eksiksiz yayıma hazır veya hukuki uyumu tamamlanmış sayılmamalıdır.

## Dosyalar

- `terms-of-service.tr.md`: Ayrıntılı Türkçe kullanım koşulları.
- `privacy-policy.tr.md`: Ayrıntılı Türkçe gizlilik politikası.
- `terms-of-service.en.md` ve `privacy-policy.en.md`: Aynı kapsam ve hükümleri koruyan İngilizce sürümler. KVKK atıfları Türkiye'nin 6698 sayılı Kişisel Verilerin Korunması Kanunu olarak açıklanır; yeni bir ülke hukuku veya dil önceliği hükmü eklenmez.
- `terms-of-service.tr.html` ve `privacy-policy.tr.html`: Aynı metinlerin bağımsız, mobil uyumlu, yazdırılabilir HTML çıktıları. Harici font, JavaScript veya analiz isteği yapmazlar. Markdown kaynaklarından `node scripts/render-legal-documents.mjs` ile üretilirler.
- `terms-of-service.en.html` ve `privacy-policy.en.html`: İngilizce metinlerin aynı tasarımla üretilmiş HTML çıktıları. İletişim alanları Türkçe sürümlerde olduğu gibi boş bırakılmıştır; yayımlama öncesi kontroller İngilizce sürümler için de geçerlidir.
- Bu dosya: İç kullanım içindir; politika sayfası olarak yayımlanmaz.

## Koddan doğrulanan veri envanteri

| Veri / işlem | Gerçek davranış | Kanıt |
| --- | --- | --- |
| Google giriş | `signInWithOAuth`, Google sağlayıcısı, uygulamada ek scope parametresi yok | `app/login/auth-form.tsx`, `lib/supabase-browser.ts` |
| E-posta ve şifre / giriş bağlantısı | E-posta, şifre veya OTP bağlantısı Supabase Auth üzerinden işleniyor | `app/login/auth-form.tsx` |
| Profil adı | `full_name` veya `name` yönetim ekranında kullanılıyor | `app/dashboard.tsx` |
| Google profil fotoğrafı | Arayüzde Google avatarı kullanılmıyor; sağlayıcının kimlik metadatasında bulunması mümkün | `app/dashboard.tsx`, Supabase Google Auth belgesi |
| Oturum | PKCE ve kalıcı Supabase oturumu; oturum **birinci taraf çerezde** tutuluyor (`@supabase/ssr` `createBrowserClient`; `httpOnly:false`, `sameSite:lax`, yol `/`, 400 gün, base64url kodlama). API çağrılarında ayrıca `Authorization: Bearer` başlığı gönderilir | `lib/supabase-browser.ts`, `lib/client-api.ts`, `lib/jwt.ts` |
| Sayfa erişim denetimi | Korumalı sayfalar sunucuda oturum çerezini okuyarak yönlendirme yapar; oturum yoksa `/login`'e gider | `proxy.ts`, `lib/supabase-server.ts` |
| Yönetici erişimi | `admins` tablosuna göre yetki; kullanıcı e-postası, kimliği, son giriş ve kayıt zamanı; işletme inceleme/düzenleme | `lib/jwt.ts`, `app/api/admin/users/route.ts`, `app/api/admin/cafes/route.ts`, `app/api/admin/cafes/[id]/route.ts` |
| İşletme ve menü | İşletme, sahibi, konum açıklaması, koordinatlar, bağlantılar, tasarım, ürünler, fiyatlar ve etiketler | `lib/menu.ts`, `lib/social-links.ts`, `app/api/cafes/[id]/route.ts` |
| Herkese açık koordinat ihtimali | İşletmenin `data` alanı yayımlanmış menünün istemci verisine yayılıyor; `lat/lng` filtrelenmiyor | `app/menu/[slug]/page.tsx` |
| Görseller | Tarayıcıda işleme; herkese açık Supabase `menu-images`; dosya adresinde kullanıcı UUID'si | `lib/storage.ts`, `lib/logo.ts`, `supabase/migrations/0001_init.sql` |
| Ziyaret | Kalıcı rastgele UUID; işletme, gün, saat ve masa; işletme/gün/ziyaretçi başına tek kayıt | `app/public-menu.tsx`, `app/api/visit/route.ts`, `supabase/migrations/0001_init.sql` |
| İstatistik | Ekranda toplulaştırılmış veri; ham UUID kayıtları veritabanında; işletme sahibi ham ziyaret verisini okuyabilen RLS yetkisine sahip | `app/api/stats/route.ts`, `supabase/migrations/0001_init.sql`, `0002_rpcs.sql` |
| Sipariş | Masa, ürünler, miktarlar, fiyatlar, toplam, durum, zaman; ziyaretçi adı/e-postası/telefonu/kartı yok | `app/api/orders/route.ts`, `supabase/migrations/0002_orders.sql` |
| Ziyaretçi UUID ve sipariş | UUID POST isteğinde var; `orders` satırına yazılmıyor; rate-limit anahtarında kullanılıyor | `app/api/orders/route.ts`, `lib/rate-limit.ts` |
| Müşteri cihaz konumu | Sepet açılırken izin isteniyor; izin varsa koordinatlar sipariş isteğinde sunucuya gidiyor; siparişte tam km ve kaynak tutuluyor | `app/public-menu.tsx`, `app/api/orders/route.ts` |
| IP temelli konum | Cihaz konumu yoksa Cloudflare `request.cf` koordinatlarıyla hesap yapılabiliyor; işletme koordinatı gerekir | `app/api/orders/route.ts` |
| İşletme konumu | Kullanıcının aldığı koordinatlar `cafes.data` içinde kalıcı saklanıyor | `app/dashboard.tsx`, `lib/menu.ts`, `app/api/cafes/[id]/route.ts` |
| Uzaklık kararı | Sinyal kaydediliyor; uzaklığa göre otomatik sipariş reddi uygulanmıyor | `app/api/orders/route.ts` |
| İstek sınırlandırma | Supabase RPC çağrısı ve Cloudflare binding; UUID içeren zaman dilimi anahtarları | `lib/rate-limit.ts`, `scripts/patch-wrangler.mjs`, `0003_admins_distance_rate.sql` |
| Kur hizmeti | Frankfurter/ECB'ye yalnızca kur sorgusu, kişisel veri taşımayan sunucu isteği | `app/api/rates/route.ts` |
| OCR/AI | Dosya adı OCR olsa da özellik metni tarayıcıda ayrıştırıyor; harici model servisi yok | `lib/ocr.ts`, `app/dashboard.tsx` |
| Takip / reklam / ödeme | İncelenen kodda Google Analytics, reklam pikseli, pazarlama aboneliği veya ödeme entegrasyonu yok | `app`, `lib`, `package.json` genel taraması |
| Otomatik silme | Veri yaşam süresi veya temizleme görevi yok; 30 günlük istatistik filtresi silme değil | `supabase/migrations`, `app/api`, `lib` |
| Hesap silme | Kullanıcıya açık silme ekranı/API'si yok; Auth user silinirse ilişkisel cascade var; Storage için ayrıca temizlik gerekir | `app/api`, `0001_init.sql`, `0002_orders.sql`, `lib/storage.ts` |

## Yayımlamadan önce tamamlanacak somut konular

1. **Çalışan iletişim kanalı:** İki metindeki boş iletişim satırını fiilen izlenen bir e-posta veya uygun başvuru kanalıyla doldurun. Alan adı tek başına hesap silme veya KVKK başvuru kanalı değildir. Kullanıcıların kullanamayacağı tahmini e-posta adresi yazmayın. “Hibrit”in hukuken veri sorumlusu olan gerçek/tüzel kişiyi yeterince tanımlayıp tanımlamadığını ve resmi bildirim için adres gerekliliğini de doğrulayın.
2. **Google izinleri:** Supabase Google sağlayıcı ayarları, Google Auth Platform Data Access ekranı ve gerçek OAuth yönlendirmesindeki `scope` değerini karşılaştırın. Kod ek scope istemiyor; bu, panellerdeki yapılandırmayı kanıtlamaz. Mevcut özellik temel kimlik bilgileriyle sınırlı olmalıdır. Canlı bir test hesabının Auth identity/user metadata alanlarını kontrol ederek alınan gerçek alanları doğrulayın. Scope veya veri farkı varsa politika güncellenmelidir. [Supabase resmi Google giriş belgesi](https://supabase.com/docs/guides/auth/social-login/auth-google).
3. **Konum bilgilendirmesi:** İşletme bilgileri ekranındaki “konum verisi saklanmaz” ifadesi işletmenin koordinatlarının saklandığı gerçek davranışla çelişiyor. Bu metin düzeltilmelidir. Müşteri sepetinde cihaz koordinatlarının işlenmesi ve IP temelli alternatif açıkça, izin istemeden önce açıklanmalıdır. Tarayıcı izni ayrı hukuki açık rızanın yerine otomatik olarak geçmez. İşletme koordinatlarının istemciye aktarılmasını gerçekten istiyor musunuz değerlendirin; gizlilik metni mevcut aktarımı açıklıyor.
4. **Ziyaret tercihi ve hukuki sebep:** `fincan-visitor` sayfa açılır açılmaz oluşturuluyor ve ziyaret isteği gönderiliyor; tercih/ret ekranı yok. Bu kalıcı istatistik tanımlayıcısının meşru menfaat şartları, ölçülülüğü ve tarayıcı depolama kuralları açısından değerlendirmesi yapılmalıdır. Rıza gerekiyorsa kodda önceden tercih alınmalıdır. Bir politika dosyası bu eksikliği kendiliğinden düzeltmez.
5. **Saklama ve silme işletimi:** Auth hesapları, menüler, ziyaretler, siparişler, ziyaretçi UUID içeren rate-limit kayıtları, Storage nesneleri, günlükler ve yedekler için gerçek saklama sürelerini belirleyin ve uygulayın. Süreler bu çalışma için uydurulmadı. Silme talebini izleyen bir süreç kurun; Auth silme öncesinde kullanıcıya ait Storage dosyalarını ve ilişkileri değerlendirin. Ziyaretçi kayıtlarını hesapsız başvuru sahibine güvenle eşleme yöntemini tanımlayın. Hukuki saklama istisnaları ile sağlayıcı yedek sürelerini belgeleyin.
6. **Altyapı / yurt dışı aktarım:** Canlı Supabase bölgesini, günlük/yedek sürelerini, SMTP sağlayıcısını, Cloudflare gözlemleme/analiz ayarlarını ve veri işleme sözleşmelerini doğrulayın. README Frankfurt diyor; örnek bağlantı farklı bir bölge ipucu taşıyor. Bu nedenle metne kesin ülke yazılmadı. KVKK m. 9 için fiilî aktarım ilişkisine uygun mekanizma ve gerekiyorsa standart sözleşme/bildirim işlemleri ayrıca tamamlanmalıdır. Genel hizmet sağlayıcı sözleşmesi yeterlilik kanıtı değildir. [KVKK standart sözleşme duyurusu](https://www.kvkk.gov.tr/Icerik/7938/Standart-Sozlesmeler-ve-Baglayici-Sirket-Kurallarina-Iliskin-Dokumanlar-Hakkinda-Kamuoyu-Duyurusu).
7. **Veri toplama noktasında aydınlatma:** Genel Privacy Policy yanında hesap/giriş, menü ziyareti, sipariş ve konum için hedefe uygun, kısa ve zamanında açıklamalar sunun. Veri sorumlusu kimliği, amaçlar, alıcılar, yöntem/hukuki sebep ve haklar ilgili işlem bakımından açık olmalıdır. Gereken açık rıza aydınlatmadan ayrı alınmalıdır. [KVKK aydınlatma duyurusu](https://www.kvkk.gov.tr/Icerik/6765/AYDINLATMA-YUKUMLULUGUNUN-YERINE-GETIRILMESI-HAKKINDA-KAMUOYU-DUYURUSU).
8. **İstek sınırlandırma doğrulaması:** Kod `rate_hit` RPC'sini çağırıyor; incelenen migration dosyaları fonksiyonu tanımlamıyor. Çağrı hata verirse kod isteği engellemeden devam ediyor. Canlı veritabanında RPC'nin ve Cloudflare binding'in bulunduğunu test edin. Gizlilik metni bunu kusursuz çalışan güvenlik garantisi olarak sunmuyor.

Bu maddeler için uygulama davranışı değiştirilmedi ve harici yönetim panellerinde işlem yapılmadı. Metinlerdeki hukuki sebep önerileri somut işletim ve sözleşme ilişkileriyle doğrulanmalıdır.

## Google Login için yayımlama

Önerilen kalıcı adresler:

- Gizlilik: `https://fincan.hibrit.dev/privacy`
- Kullanım koşulları: `https://fincan.hibrit.dev/terms`
- Halka açık ürün tanıtımı: Mevcut `/landing` sayfası, prototip ifadeleri kaldırılıp ürün kimliği ve politika bağlantıları eklenerek kullanılabilir.

Bu dosyalar henüz `/privacy` veya `/terms` route'u eklemez ve yayın/deploy yapmaz. HTML dosyalarını ilgili adreslerden sunun veya uygulamaya aynı içerikleri taşıyın. Google'a URL girerken gerçekten erişilebilir son adresi kullanın.

Sayfalar HTTPS üzerinden, giriş istemeden erişilebilmeli; giriş ve kayıt ekranından ve halka açık tanıtım sayfasından bağlantılanmalıdır. Google Auth Platform Branding ekranındaki uygulama adı Fincan, işletmeci bilgisi Hibrit ve destek e-postası gerçek yapılandırmayla uyuşmalıdır. `hibrit.dev` alan adı sahipliğini doğrulayın ve ilgili authorized domains/redirect ayarlarını kontrol edin. [Google OAuth üretim politikaları](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

Google OAuth istemcisindeki yönlendirme, Supabase kullanıldığı için tipik olarak Supabase projesinin `/auth/v1/callback` adresidir; uygulamanın `/auth/callback` adresi ayrı bir dönüş adımıdır. Custom Auth domain varsa gerçek sağlayıcı adresini esas alın. Supabase Site URL ve izinli dönüş adreslerini canlı alan adıyla eşleştirin. Temel profil izinleri için hazırlanan bu metin, genişletilmiş Google API erişimine yönelik doğrulamanın yerine geçmez. Google onayı garanti edilmez.

Google verilerinin nasıl alındığı, kullanıldığı, saklandığı ve paylaşıldığı politika içinde açıklanmalıdır. Gelecekte ek Google verisi kullanımı getirilirse metin ve ürün içi bilgilendirme önce güncellenmelidir. [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

## İnceleme notları

- Oturum, 10 Ekim 2026'daki ilk incelemeden sonra **localStorage'dan birinci taraf çereze** taşındı (`@supabase/ssr`). Ziyaretçi kimliği ve tema anahtarları hâlâ localStorage'dadır; bu nedenle politika metni iki mekanizmayı ayrı anlatır. Çerez, kullanıcı giriş yaptığında oluşur; giriş yapmayan ziyaretçiye çerez yazılmaz.
- README'deki JWKS, iki yönetici/env izin listesi ve secret key'in kullanılmadığı açıklamaları güncel kodla uyuşmuyor. Kod `auth.getUser`, `admins` tablosu ve service client kullanıyor; metinler bunları esas alır.
- Sadece Google profil verisi toplanıyormuş gibi bir politika hazırlanmadı: ziyaret, sipariş, konum, herkese açık içerik, yönetici erişimi ve tarayıcı depolaması birlikte açıklandı.
- Başvurunun en geç 30 günde sonuçlandırılması hukuki yükümlülüğü, teknik olarak bütün yedeklerin aynı anda silineceği vaadi değildir. [KVKK başvuru süreleri](https://www.kvkk.gov.tr/Icerik/5358/Kamuoyu-Duyurusu).
- İki kamuya yönelik metin, iç inceleme notlarından ayrıdır. Sayfalarda kullanılmayan e-posta, bilinmeyen veri merkezi ülkesi, uygulanmamış otomatik silme süresi veya panelde bulunmayan hesap silme düğmesi vaat edilmez.
