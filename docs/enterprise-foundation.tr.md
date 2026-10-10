# Paket A Enterprise temeli

Paket A, aynı özel özellikleri isteyen farklı müşterilerin ortak ekran kodudur. Ortak Kafe ile Nova Kafe'nin verileri birleştirilmez. Paket erişimi ve işletme veri erişimi ayrı kontrol edilir. ERP ve diğer satın alınan modüller bu paketten bağımsızdır.

## Ayrı önizlemeler

- Ortak Kafe: `/enterprise/package-a?preview=1&scenario=ortak`
- Nova Kafe: `/enterprise/package-a?preview=1&scenario=nova`

İki örnek hesap aynı ekranı kullanır; her görünüm yalnızca seçilen örnek hesabın kayıtlarını içerir. Önizleme sadece `NODE_ENV=development` ortamında açılır ve canlı veritabanına yazmaz. Örnek hesap değiştiricisi canlıda bulunmaz. Yayında `preview=1` parametresi erişim kontrolünü devre dışı bırakamaz.

## Admin panelinden atama

Bir defaya mahsus Supabase SQL Editor'da `supabase/migrations/0006_admin_access_assignments.sql` uygulanmalıdır. Sonrasında paket/modül atamak veya kaldırmak için SQL yazılması, UUID bulunması, .env değiştirilmesi veya yeniden dağıtım yapılması gerekmez.

Admin panelinde **Enterprise atamaları** sekmesini açın. Alternatif olarak **İşletme hesapları** bölümünde işletmeyi açıp **Paketler ve modüller** alanını kullanın:

1. İşletmeyi seçin; hesap sahibi sunucuda otomatik belirlenir.
2. **Paket ekleyin** alanından Paket A'yı seçip kaydedin. Bu atama yalnızca seçilen işletmenin özel çalışma alanını açar.
3. **Modül ekleyin** alanından ERP'yi seçip kaydedin. Bu, hesaba bağlı ayrı bir modül atamasıdır; hesabın bütün işletmeleri için geçerlidir. `0007_erp.sql` kurulumundan sonra Stok / ERP ekranını açar. İşletmelerin stok ve finans verileri birbirinden ayrıdır. [ERP kurulumu ve kullanımı](erp.tr.md).
4. İsterseniz bir geçerlilik tarihi belirleyin; boş bırakırsanız atama süresizdir.
5. Atama listesinde **Kaldır** ile erişimi kapatın. Aynı paketi veya modülü yeniden atamak mevcut kaydı etkinleştirir ve süreyi günceller.

Enterprise atamaları `enterprise_assignments`, hesap modülleri `account_module_grants` tablolarında tutulur. Tablolar normal kullanıcıların okuma/yazmasına kapalıdır. Admin API'si her işlemde admin rolünü, isteğin kaynağını, katalog anahtarını ve tarihi doğrular. Kullanıcı kimliği tarayıcıdan alınmaz; seçilen işletmenin sahibinden belirlenir.

Enterprise ekranı ve yazma uçları her istekte veritabanından aktif, süresi dolmamış atamayı okur ve işletmenin hâlâ kullanıcıya ait olduğunu doğrular. Ortak Kafe ile Nova Kafe aynı paketi kullansa da verileri ayrıdır. Paket kaldırılması modül kaydını değiştirmez. Eski `ENTERPRISE_PACKAGE_A_ASSIGNMENTS` ortam değişkeni artık okunmaz; erişimin yeniden açılmasına yol açacak bir ortam değişkeni yedeği yoktur.

Henüz gerçek hesaba atama yapılmadı; kurulum sonrası atamaları admin arayüzünden seçebilirsiniz. Yerel önizlemeler bu tablolardan bağımsız örnek veriler kullanmaya devam eder.

## Paket A sipariş özellikleri

Manuel sipariş ekleme ve ürün/adet/fiyat/masa düzenleme Paket A'nın Siparişler ekranına taşındı. Standart panel yalnızca sipariş görüntüleme ve normal durum ilerletme işlemlerini sunar. Otomatik yenileme ve bildirimler standart özellik olarak kalır.

Paket A önizlemesinde manuel sipariş oluşturma ve düzenleme örnek kayıtlar üzerinde denenebilir; değişiklikler sadece sayfada tutulur ve yenileyince sıfırlanır. Gerçek kullanımda bütün manuel yazma uçları kullanıcı + Paket A + işletme atamasını yeniden doğrular.

Supabase SQL Editor'da `supabase/migrations/0005_enterprise_manual_orders.sql` dosyasını uygulayın. Bu dosya standart kullanıcıların doğrudan PostgREST aracılığıyla sipariş içeriğini değiştirmesini engeller; yalnızca durum sütununu güncellemelerine izin verir. Paket A içeriği sunucu service client üzerinden, açık paket/sahiplik/versiyon kontrollerinden sonra kaydeder. API kısıtları kodda aktiftir; doğrudan veritabanı erişiminin kısıtlanması bu SQL'in uygulanmasını gerektirir.

## Kod sınırı

- `enterprise/registry.ts`: paket tanımı ve tek kullanıcı/işletme atama çözümü.
- `enterprise/server.ts`: bağımsız erişim ve sahiplik kontrolü.
- `enterprise/extensions/package-a/`: müşteri ekranları, stiller, türler ve sahte örnek veriler.
- `enterprise/navigation.tsx`: standart paneldeki küçük bağlantı noktası.
- `app/enterprise/package-a/`: sayfa giriş noktası.
- `app/api/enterprise/`: sunucuda doğrulanan erişim ve tek işletmeli veri uçları.

Ana dashboard'a yalnızca navigasyon bileşeni eklendi. Özel ekran kodu ana dashboard'a gömülmedi. Sonraki özel özellikler paket klasöründe ve paket API'lerinde geliştirilir. Müşterilerden yalnızca biri farklı özellik isterse, paketin içinde ayrıca müşteri yetkisi tanımlanır veya yeni paket uzantısı oluşturulur; mevcut ortak ekranlara müşteri kimliği koşulları dağıtılmaz.

Atamalar artık veritabanından okunur. Enterprise ve modül katalogları kodda ayrı tanımlanır; ödeme entegrasyonu eklenirse aynı atama tabloları doğrulanmış sunucu işlemleriyle güncellenebilir.

## Doğrulama

`node scripts/enterprise-foundation-test.mjs` aynı paketteki iki ayrı müşteriyi, URL değiştirerek diğer müşteriye erişim denemesini, hatalı sahiplik atamasını ve her veri sorgusunun işletme kapsamını sınar. Otomatik testler gerçek hesapları veya canlı verileri değiştirmez.

`node scripts/admin-access-test.mjs` admin yetkisini, hesap sahibinin güvenilir kaynaktan seçilmesini, paket/modül bağımsızlığını, süre kontrolünü ve kaldırmanın erişimi kapatmasını sınar.
