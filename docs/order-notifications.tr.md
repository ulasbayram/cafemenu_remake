# Sipariş yönetimi ve telefon bildirimleri

Manuel sipariş ekleme ve içerik düzenleme yalnızca Paket A Enterprise çalışma alanının Siparişler ekranındadır. Standart kullanıcı ekranında bu iki özellik bulunmaz. Masa, ürün, adet, birim fiyat ve aktif sipariş durumu düzenlenebilir. Paket A ataması her yazma isteğinde sunucuda doğrulanır. `0005_enterprise_manual_orders.sql` uygulanarak doğrudan PostgREST üzerinden içerik düzenleme de engellenir. Tamamlanmış sipariş değiştirilemez. Başka cihazda değişen bir sipariş eski ekran üzerinden kaydedilirse sunucu 409 döndürür.

## Açık ekran

Supabase Realtime, işletmenin sipariş değişikliklerini anında iletir. Bağlantı yoksa görünür ekranda istek tamamlandıktan 1 saniye sonra kontrol yapılır; istekler üst üste binmez. Canlı bağlantı varken 10 saniyelik kontrol veriyi uzlaştırır. Gizli ekranda polling durur ve görünür olunca hemen yenilenir.

“Sipariş sesini aç” düğmesi tarayıcının kullanıcı etkileşimi şartını karşılar ve bir deneme sesi çalar. İlk yüklemede eski siparişlere ses verilmez. Yeni siparişler için ses ve ekran mesajı üretilir. Cihaz veya tarayıcı ses oynatmayı duraklatırsa düğmeden yeniden etkinleştirin.

Açık ekrandaki ses, yaklaşık 1,6 saniyelik ve iki kez çalan çift tonlu zildir. Önceki kısa sinüs melodisine göre ses seviyesi artırılmış, küçük hoparlörlerde ayırt edilmesi için ek armonik kullanılmıştır. Ses açma düğmesi yeni tonu da denetir. Bu değişiklik işletim sisteminin kilit ekranı bildirim tonunu veya cihazın ses düzeyini değiştirmez.

## Arka plan bildirimlerini etkinleştirme

1. Supabase SQL Editor'da `supabase/migrations/0004_order_notifications.sql` dosyasını uygulayın. Bu işlem cihaz abonelik tablosunu oluşturur ve sipariş tablosunu Realtime yayınına ekler. Kayıtlar yalnızca server service role ile erişilir.
2. Proje klasöründe `node scripts/generate-push-keys.mjs https://CANLI-ALAN-ADINIZ` çalıştırın. Alternatif olarak parametreyi gerçek iletişim adresiyle `mailto:adres@alanadi.com` olarak verin. Script VAPID anahtarlarını `.env` dosyasına yazar; mevcut anahtarları değiştirmez ve gizli anahtarı ekrana yazmaz.
3. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` değerlerini aynı şekilde canlı Cloudflare Worker secrets alanına ekleyin. Yerel sunucuyu yeniden başlatın. Anahtarlar herkese açık kaynak dosyalarına yazılmamalıdır; public key abonelik API'sinden verilir.
4. HTTPS üzerindeki Siparişler ekranında “Telefon bildirimlerini aç” düğmesine dokunun ve izin verin. Geliştirmede localhost da güvenli bağlam kabul edilir; yerel sunucunun bildirimi gönderebilmesi için çalışıyor olması gerekir.
5. iPhone/iPad'de iOS/iPadOS 16.4+ kullanın. Safari'de **Paylaş** (bazı sürümlerde önce **… / Sayfa Menüsü**, ardından Paylaş) → **Ana Ekrana Ekle** yolunu izleyin. Seçenek yoksa paylaş listesinin altındaki **Eylemleri Düzenle** bölümüne bakın. **Web Uygulaması Olarak Aç** seçeneği varsa açık bırakın. Uygulamayı ana ekran simgesinden açtıktan sonra bildirim izni verin. Android Chrome'da uygulama içindeki **Uygulama olarak yükle** düğmesini veya Chrome **⋮ → Uygulamayı yükle / Ana ekrana ekle** menüsünü kullanın. Android'de kurulum zorunlu değildir.

Kurulum adımları: [Apple iPhone kılavuzu](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27). iOS 16.4+ ana ekran Web Push koşulları: [WebKit](https://webkit.org/blog/13878/).

Telefonun kilit ekranına “işletme · Yeni sipariş” ve masa/tutar bilgisi gönderilir. Bildirime dokunmak ilgili işletmenin Siparişler ekranını açar. Arka planda özel web sesi zorlanamaz: işletim sisteminin bildirim sesi, sessiz/odak modu, izinleri ve pil kısıtları geçerlidir. Anlık ve kesintisiz teslim garantisi yoktur.

Abonelik cihaz bazındadır ve kullanıcıya ait bütün işletmeler için çalışır. Çıkış yaparken cihazın aboneliği kaldırılır. Süresi dolmuş cihazlar push servisinin 404/410 yanıtıyla temizlenir. Abonelik başka hesapla açılmış paylaşılan cihazda etkinleştirilirse mevcut hesabın üzerine bağlanır. Service worker özel sayfaları veya API yanıtlarını önbelleğe almaz.

Yeni siparişler uygulamanın iki oluşturma endpoint'inden push tetikler. Supabase panelinden doğrudan girilen siparişler açık ekranda Realtime ile görünür; bunlar sunucu oluşturma akışından geçmediği için kapalı cihaza Web Push göndermez.

## Doğrulama

`node scripts/order-management-test.mjs` ile toplamların kuruş hesabı, fiyat geçmişi, erişim kontrolü, düzenleme yarışları ve bildirim hatasının siparişi bozmaması kontrol edilir. Gerçek telefon bildiriminin uçtan uca doğrulanması için yukarıdaki kurulum ve telefon üzerinde izin gerekir. Canlı veritabanına otomatik test siparişi eklenmez.

`node scripts/notification-reliability-test.mjs` gerçek modülleri izole ortamda çalıştırır: worker aktivasyon bekleme/zaman aşımı, izin isteğinin kullanıcı dokunuşundan başlatılması, bağlantı hatasında aboneliğin korunması, VAPID anahtar eşleşmesi/değişimi, Apple push adresleri, hesaba bağlı test gönderimi ve 404/410 temizliği, görünmeyen/odakta olmayan istemcilerde işletim sistemi bildiriminin sessize alınmaması ve güvenli bildirim yönlendirmesi. Dış push servisine veya canlı veritabanına istek göndermez.

### Canlı sürümden sonra telefon kontrolü

1. Aynı VAPID anahtarlarını koruyarak yeni sürümü yayınlayın; bu düzeltmeler için yeni migration yoktur. Siparişler ekranını yenileyin. Sunucu anahtarı/abonelik tablosu hatası varsa ekran artık sebebini ve kodunu gösterir.
2. Android Chrome ve iPhone ana ekran uygulamasında bildirimleri etkinleştirin. **Test bildirimi gönder** düğmesi yalnızca mevcut hesaba kayıtlı o cihaza test mesajı yollar; sipariş oluşturmaz. “İletildi” sonucu sağlayıcının mesajı kabul ettiğini gösterir; telefonda görüntülendiğini doğrulamaz.
3. Teste dokunup hemen başka uygulamaya geçin. Bildirim merkezinde kontrol edin. Kilit ekranı için de test gönderip telefonu hemen kilitleyin. Ardından normal işletme akışında verilen bir siparişle uçtan uca kontrol edin.
4. Bildirim görünmüyorsa telefonun Fincan/Chrome bildirim izni, kilit ekranında gösterim, ses, Odak/Rahatsız Etmeyin ve Android pil/veri kısıtlarını kontrol edin. iPhone'da Safari sekmesi yerine ana ekran simgesinden açılmış olmalıdır.
5. Bildirime dokununca doğru işletmenin Siparişler ekranının açıldığını doğrulayın. Oturum bitmişse giriş sonrası hedef korunur.

### Hata kodları

| Kod | Kontrol |
| --- | --- |
| `PUSH_CONFIG_MISSING` / `PUSH_CONFIG_INVALID` | Canlı Worker VAPID değerleri ve anahtar çiftinin eşleşmesi. Anahtarları rastgele yeniden üretmeyin. |
| `PUSH_DATABASE_MISSING` | Mevcut `0004_order_notifications.sql` kurulumu. |
| `PUSH_WORKER_TIMEOUT` / `PUSH_WORKER_REDUNDANT` | Bağlantı, HTTPS ve worker dosyasına erişim; sayfayı yenileyip deneyin. |
| `PUSH_SUBSCRIBE_ABORTERROR` | Android Chrome/Google Play Hizmetleri güncellemeleri ve telefonun push servisine ağ erişimi. |
| `PUSH_PERMISSION_DENIED` | Telefon/tarayıcı ayarlarından bildirim izni. Uygulama reddedilmiş izni kendiliğinden tekrar açamaz. |
| `PUSH_KEY_CHANGED` | Sunucu anahtarı değişmiş; düğmeden açıkça yeniden etkinleştirin. |
| `PUSH_SAVE` / `PUSH_CONFIG_NETWORK` | Bağlantı veya oturum; geçici hata geçince tekrar deneyin. Mevcut yerel abonelik korunur. |
| `PUSH_TEST_EXPIRED` | Sağlayıcı aboneliği iptal etmiş; bildirimleri yeniden etkinleştirin. |

Arka plan bildirimi açık bir tarayıcı zamanlayıcısına bağlı değildir; sunucu Web Push ve service worker üzerinden çalışır. Worker artık kurulumdan önce aktif hale gelene kadar beklenir. Kilitli/gizli sekme ses çalınmış gibi onay veremez. Bozuk/eksik push içeriğinde bile görünür bildirim gösterilir; Safari görünmeyen push kullanımında izni geri çekebilir ([WebKit açıklaması](https://webkit.org/blog/12945/meet-web-push/)).
