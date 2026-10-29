# Mobil arayüz ve bildirim kontrolü — 30 Ekim 2026

Mevcut tasarım ve sayfa yapısı korunarak yerel uygulamada kontrol edildi. Gerçek işletme, sipariş ve yetki kayıtları değiştirilmedi. Sipariş/ödeme pencereleri geliştirme önizlemesinde, müşteri sepeti geçici örnek verili sayfada denendi; geçici sayfa kaldırıldı.

## Arayüz kapsamı

320 × 740 dar görünümde sayfanın yatay genişliği ve taşan elemanlar incelendi; geniş tablolar/grafiklerin kendi kaydırma alanları korundu.

| Alan | Kontrol |
| --- | --- |
| İşletme paneli | Genel bakış, işletmeler, menüler, ürünler, siparişler, içe aktarma, istatistikler, ayarlar |
| İşletme pencereleri | İşletme bilgileri, QR paylaşımı, ürün düzenleme/etiketler |
| Menü tasarım editörü | Üst çubuk, önizleme araçları ve ayar paneli |
| Admin | Genel bakış, işletme listesi, kullanıcılar, Enterprise/modül atamaları ve tarih alanları |
| Admin destek editörü | Tasarım ve ürün sekmeleri, ürün formu, admin renkleri |
| ERP önizlemesi | Stok, reçeteler, ciro/kâr ve giderler |
| Paket A önizlemesi | Genel bakış, siparişler, istatistikler, özel özellikler, manuel sipariş ve ödeme/indirim pencereleri |
| Landing | Bölümler, ERP/CRM seçimi, fiyatlar, demo formu; açık/koyu tema |
| Giriş | Şifreli giriş, hesap oluşturma ve bağlantıyla giriş |
| Müşteri menüsü | Açık/koyu tema, TR/EN seçimi, Wi-Fi alanı ve örnek sepet/günlük kod alanı |
| QR baskı | Yerel ortamda üretim isteği hata verdi; hata ekranı taşmıyor. Üretilmiş baskı önizlemesi bu kontrolde doğrulanamadı. |

Sipariş sayfası ayrıca 390 × 844 ve 1280 × 900 boyutlarında; admin tasarım editörü 1280 × 900 boyutunda kontrol edildi. Bunlar masaüstü tarayıcısındaki ekran boyutu kontrolleridir; gerçek iOS klavyesi, Safari çubukları ve Android cihaz davranışının yerine geçmez.

## Giderilen nedenler

- Sipariş alanındaki grid'in içerik genişliğine göre büyümesi: 320 px ekranda belge 425 px'e çıkıyordu. Grid ve çocukları küçülebilir hale getirildi.
- İşletme listesindeki arama alanı: dar ekranda başlıkla aynı satıra sığmıyordu; satır kırması düzeltildi.
- Editör üst çubuğunda işletme adı ve işlemler birbirine giriyordu; mobilde mevcut bileşenler iki satıra yerleştirildi.
- Admin destek editörü ana dashboard renklerini alıyordu; kendi admin paleti ve ekran yüksekliği kapsamı eklendi.
- Dashboard koyu teması açık müşteri sepetine/landing formuna sızıyordu; form renkleri ilgili sayfanın temasına bağlandı.
- Landing örnek telefon ve renk kartı çok dar ekranda dışarı taşıyordu; kapsayıcıya sığması sağlandı.
- Form sütunları, yerel sayı/tarih alanları, uzun başlıklar ve pencereler dar ekran yüksekliği için sınırlandı. Mobil metin girişleri iOS odak yakınlaştırmasını önlemek için 16 px yapıldı.

## Bildirim doğrulaması

Kurulum/aktivasyon yarışları, geçici hatada aboneliğin silinmesi, VAPID kontrolü ve odakta olmayan sayfanın telefon bildirimini sessize alması ele alındı. Test gönderimi yalnızca oturumdaki hesaba ait cihaz kaydını kullanır. Ayrıntılar ve fiziksel telefon test adımları: [Sipariş bildirimleri](order-notifications.tr.md).

13/13 test grubu, TypeScript kontrolü ve üretim derlemesi başarılı. ESLint hata vermedi; projede mevcut 7 uyarı bulunuyor. Canlı telefon sağlayıcısı teslimi ve kilit ekranı testi henüz fiziksel cihazda doğrulanmadı. Yeni migration eklenmedi.
