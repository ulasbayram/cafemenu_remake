# Sipariş, ödeme, Wi-Fi ve İngilizce menü

## Kurulum

Uygulamanın bu sürümünü yayınlamadan önce Supabase SQL Editor'da
`supabase/migrations/0010_order_settlement.sql` dosyasını çalıştırın.
0007 ve 0009 ERP migration'ları önceden uygulanmış olmalıdır.
Bu geliştirme sırasında canlı veritabanına migration uygulanmadı.
Yeni ortam değişkeni gerekmez.

Migration ödeme yöntemi ve fiş indirimi alanlarını ekler. Eski siparişlerin
ödeme yöntemi bilinmiyor olarak kalır; nakit veya kart olduğu varsayılmaz.
Sipariş güncellemeleri yalnızca sahiplik ve güncellik kontrolü yapan sunucu
uçlarından yapılır. Tamamlanmış siparişler değiştirilemez.

## İşletme akışı

- Manuel sipariş girişi/düzenleme Paket A'ya özel kalır. Sol kategoriler,
  sağ ürün kartları ve altta sepet bulunan pencere kullanılır.
- Teslim edilen siparişte **Ödeme ve indirim** açılır. Ürün satırından ikram
  adedi ve ek TL indirimi; fişin tamamından TL veya yüzde indirimi tanımlanır.
- **İndirimi kaydet** ödeme almadan değişiklikleri kaydeder. **Ödeme alındı ·
  Tamamla** için nakit veya kredi kartı seçilmelidir. Bu işlem bir ödeme
  kuruluşundan tahsilat yapmaz; işletmenin aldığı ödemeyi kaydeder.
- İndirim sırası: ikram → ürün indirimi → kalan tutar üzerinden fiş indirimi.
  İndirimler tutarı aşamaz. Net tutarlar kuruş bazında dengelenir.
- İkramlar ürün adedinden çıkarılmaz; ERP stok ve malzeme maliyetleri sunulan
  bütün ürünlere göre hesaplanır. Gelir, indirim sonrası tutardır.
- ERP → Finans → Gün sonu özeti içinde nakit/kart fiş sayısı, ödenen ürün
  adedi, ikram/bedelsiz ürün adedi, indirim ve tahsilat; ayrıca ürünlere göre
  ödeme dağılımı görülür. %100 indirimli satırlar bedelsiz sayılır.

## Misafir Wi-Fi

İşletme bilgileri veya menü editöründeki Misafir Wi-Fi alanına ağ adı ve
şifre girilir. Şifre boşsa bölüm gizlenir.

**Menüye giren herkes** seçilirse şifre tüm ziyaretçilere açılır.
**Sipariş verdikten sonra** seçilirse şifre ilk sayfa verisinden çıkarılır;
başarılı sipariş yanıtında açılır. Aynı tarayıcıda 12 saatlik HttpOnly makbuz
çereziyle yenileme sonrası erişim korunur. Sunucu makbuzun aynı işletmeye
ait ve son 12 saat içinde oluşturulmuş olduğunu doğrular.
Sipariş modu kapalıysa veya misafir geçerli masa erişimine sahip değilse
sipariş sonrası erişim açılamaz. Wi-Fi şifresi gösterilebilir ve kopyalanabilir.

## Türkçe / İngilizce

Ürün düzenlemede **İngilizce menü bilgileri** altında İngilizce ürün adı,
açıklama ve kategori adı girilir. Kategori çevirisi aynı kategorideki
ürünlere ortak uygulanır. Misafir menüsündeki TR/EN seçimi ürünleri,
kategorileri, hazır etiketleri ve sipariş arayüzünü değiştirir.
Boş çeviri alanları Türkçe içeriğe döner; otomatik çeviri servisi kullanılmaz.
Menü editöründen İngilizce kısa işletme açıklaması da eklenebilir.

## Kontrol

`npm test` içindeki `settlement-test.mjs` gerçek Postgres uyumlu PGlite ile
0010 migration'ını; ödeme zorunluluğunu, ikramın stoktan düşmesini, net ERP
gelirini, geçmiş ödeme belirsizliğini ve tamamlanan kayıtların değişmezliğini
kontrol eder. Sipariş uçlarının sahiplik/güncellik ve manipüle fiyat kontrolleri
`order-management-test.mjs` içindedir. Testler canlı sistemlere yazmaz.
