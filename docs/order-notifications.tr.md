# Sipariş yönetimi ve telefon bildirimleri

Manuel sipariş ekleme ve içerik düzenleme yalnızca Paket A Enterprise çalışma alanının Siparişler ekranındadır. Standart kullanıcı ekranında bu iki özellik bulunmaz. Masa, ürün, adet, birim fiyat ve aktif sipariş durumu düzenlenebilir. Paket A ataması her yazma isteğinde sunucuda doğrulanır. `0005_enterprise_manual_orders.sql` uygulanarak doğrudan PostgREST üzerinden içerik düzenleme de engellenir. Tamamlanmış sipariş değiştirilemez. Başka cihazda değişen bir sipariş eski ekran üzerinden kaydedilirse sunucu 409 döndürür.

## Açık ekran

Supabase Realtime, işletmenin sipariş değişikliklerini anında iletir. Bağlantı yoksa görünür ekranda istek tamamlandıktan 1 saniye sonra kontrol yapılır; istekler üst üste binmez. Canlı bağlantı varken 10 saniyelik kontrol veriyi uzlaştırır. Gizli ekranda polling durur ve görünür olunca hemen yenilenir.

“Sipariş sesini aç” düğmesi tarayıcının kullanıcı etkileşimi şartını karşılar ve bir deneme sesi çalar. İlk yüklemede eski siparişlere ses verilmez. Yeni siparişler için ses ve ekran mesajı üretilir. Cihaz veya tarayıcı ses oynatmayı duraklatırsa düğmeden yeniden etkinleştirin.

## Arka plan bildirimlerini etkinleştirme

1. Supabase SQL Editor'da `supabase/migrations/0004_order_notifications.sql` dosyasını uygulayın. Bu işlem cihaz abonelik tablosunu oluşturur ve sipariş tablosunu Realtime yayınına ekler. Kayıtlar yalnızca server service role ile erişilir.
2. Proje klasöründe `node scripts/generate-push-keys.mjs https://CANLI-ALAN-ADINIZ` çalıştırın. Alternatif olarak parametreyi gerçek iletişim adresiyle `mailto:adres@alanadi.com` olarak verin. Script VAPID anahtarlarını `.env` dosyasına yazar; mevcut anahtarları değiştirmez ve gizli anahtarı ekrana yazmaz.
3. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` değerlerini aynı şekilde canlı Cloudflare Worker secrets alanına ekleyin. Yerel sunucuyu yeniden başlatın. Anahtarlar herkese açık kaynak dosyalarına yazılmamalıdır; public key abonelik API'sinden verilir.
4. HTTPS üzerindeki Siparişler ekranında “Telefon bildirimlerini aç” düğmesine dokunun ve izin verin. Geliştirmede localhost da güvenli bağlam kabul edilir; yerel sunucunun bildirimi gönderebilmesi için çalışıyor olması gerekir.
5. iPhone/iPad'de iOS/iPadOS 16.4+ kullanın; Safari'nin paylaş menüsünden **Ana Ekrana Ekle** yapın ve uygulamayı bu simgeden açın. Android'de destekleyen tarayıcıda bildirim izni verin; ana ekrana eklemek kullanım için uygundur.

Telefonun kilit ekranına “işletme · Yeni sipariş” ve masa/tutar bilgisi gönderilir. Bildirime dokunmak ilgili işletmenin Siparişler ekranını açar. Arka planda özel web sesi zorlanamaz: işletim sisteminin bildirim sesi, sessiz/odak modu, izinleri ve pil kısıtları geçerlidir. Anlık ve kesintisiz teslim garantisi yoktur.

Abonelik cihaz bazındadır ve kullanıcıya ait bütün işletmeler için çalışır. Çıkış yaparken cihazın aboneliği kaldırılır. Süresi dolmuş cihazlar push servisinin 404/410 yanıtıyla temizlenir. Abonelik başka hesapla açılmış paylaşılan cihazda etkinleştirilirse mevcut hesabın üzerine bağlanır. Service worker özel sayfaları veya API yanıtlarını önbelleğe almaz.

Yeni siparişler uygulamanın iki oluşturma endpoint'inden push tetikler. Supabase panelinden doğrudan girilen siparişler açık ekranda Realtime ile görünür; bunlar sunucu oluşturma akışından geçmediği için kapalı cihaza Web Push göndermez.

## Doğrulama

`node scripts/order-management-test.mjs` ile toplamların kuruş hesabı, fiyat geçmişi, erişim kontrolü, düzenleme yarışları ve bildirim hatasının siparişi bozmaması kontrol edilir. Gerçek telefon bildiriminin uçtan uca doğrulanması için yukarıdaki kurulum ve telefon üzerinde izin gerekir. Canlı veritabanına otomatik test siparişi eklenmez.
