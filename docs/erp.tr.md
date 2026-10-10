# ERP Modülü

CRM bu modülün parçası değildir. ERP, Enterprise paketlerinden bağımsız hesap modülüdür. Aynı hesabın her işletmesi ayrı stok, reçete, gider ve satış kaydı kullanır.

## Kurulum

1. Supabase SQL Editor üzerinde `0006_admin_access_assignments.sql` uygulanmış olmalı. Daha önce uygulanmışsa tekrar gerekmez.
2. `supabase/migrations/0007_erp.sql` dosyasını bir kez çalıştırın. Canlı veriler için otomatik eski sipariş aktarımı yapılmaz.
3. Admin panelinde Enterprise atamaları → işletme → Modül ekleyin → ERP Modülü seçin. Var olan aktif ERP atamaları da bu ekranı açar. Gerekirse geçerlilik tarihi girin.
4. İşletme hesabıyla ana paneli yenileyin. Sidebar'da **Stok · ERP** görünür. `/modules/erp` bağlantısı da aynı erişim kontrolünü kullanır.

Yeni bir ortam değişkeni gerekmez. Mevcut sunucu `SUPABASE_SECRET_KEY` ayarı kullanılır; tarayıcıya gönderilmez. Yerel geliştirme önizlemesi `/modules/erp?preview=1` kurgusal kayıtları gösterir ve veritabanına yazmaz. Yayında bu parametre erişimi açmaz.

## Stok ve reçeteler

- Malzemeler L, kg ve adet birimleriyle tutulur. Miktarlar PostgreSQL `numeric(18,6)` ile saklanır. 250 ml = 0,25 L; 18 g = 0,018 kg.
- Paketli / hazır menü ürünü için yeni malzeme formunda **Menü ürününü doğrudan takip et** seçilebilir. Adet stoğu ve her satışta 1 adet tüketen reçete birlikte oluşturulur. Önceden reçetesi olan ürünler burada değiştirilmez.
- Hazırlanan ürün için malzemeleri ekleyin, ardından **Ürün reçeteleri** bölümünde bir adet ürünün malzemelerini ve miktarlarını tanımlayın. İki latte, reçetedeki süt miktarının iki katını tüketir.
- Açılış stoğu, alış girişi, sayım ve sipariş tüketimi hareket günlüğüne yazılır. Ekranda son 100 hareket gösterilir.
- Alış girişi miktar ekler ve ağırlıklı ortalama birim maliyeti hesaplar. Eldeki pozitif stoğun veya yeni alışın fiyatı eksikse ortalama maliyet bilinmiyor olarak kalır. Eski stok tükenince yeni bilinen fiyat kullanılabilir.
- Sayım düzeltmesi fiziksel toplamı yazar; eşzamanlı sipariş varsa sürüm kontrolüyle reddedilir. Sayım stok alışını veya işletme giderini temsil etmez.

## Sipariş entegrasyonu

Sipariş **Tamamlandı** olduğunda ödeme alınmış kabul edilir. Siparişin oluşturulması ve teslim edilmesi stok düşürmez. PostgreSQL tetikleyicisi ödeme durum değişikliğiyle aynı işlemde reçeteyi okur, stok hareketini ve satış maliyetini kaydeder. Normal panel ve Paket A siparişleri aynı akışı kullanır. Menüde ürün kalmadığında da tanımlı eski ürün reçeteleri sipariş ürün kimliğiyle çalışabilir.

İşletme bazlı işlem kilidi eşzamanlı stok / reçete güncellemelerini sıraya alır. Sipariş kimliği tekil satış kaydıdır; tekrar durum güncellemesi ikinci tüketim oluşturmaz. Form kayıtları istek kimliğiyle tekrar gönderimlerde de tek kez işlenir. İşlem başarısızsa stok, maliyet ve durum birlikte geri alınır.

Yetersiz stok ödeme kaydını engellemez; miktar eksiye iner ve **Stok açığı** uyarısı görünür. Fiziksel stok sayımı veya alış girişiyle düzeltilebilir. İade, sipariş iptali ve malzeme fire muhasebesi bu sürümün ayrı iş akışları değildir; sayım farkının finansal kaydı gerektiğinde ayrıca işletme gideri kaydedilmelidir.

Reçete ve maliyet, siparişin tamamlanma anındaki değerlerdir. Sonraki fiyat / reçete değişikliği geçmiş satış maliyetini değiştirmez. Modül kaldırılmış veya süresi dolmuşken yeni stok düşümü yapılmaz; biriken siparişler yeniden atamada geriye dönük düşürülmez. Stok yeniden sayılmalıdır. Eski kayıtlar silinmez.

## Finans ve tavsiyeler

Raporlar ERP aktifken tamamlanan satışları kapsar. Eski siparişlere sonradan mevcut reçeteleri uygulamak yanlış tüketim / maliyet üreteceği için geçmiş satış aktarımı yoktur. Gün sınırı Türkiye saatidir, sipariş oluşturulma tarihi yerine ödeme tamamlanma zamanı kullanılır.

- Ciro = tamamlanan siparişlerin toplamı.
- Malzeme maliyeti = tüketilen reçete miktarı × o anki ortalama alış maliyeti.
- Tahmini faaliyet kârı = ciro − satılan malzeme maliyeti − kaydedilen işletme giderleri.
- Stok alışlarının tamamı ayrıca gider düşülmez; elde kalan malzeme henüz tüketilmedi. Aynı alış tutarını Giderler'e tekrar eklemek çift maliyet oluşturur.
- Reçete veya birim maliyet eksikse sipariş **eksik maliyetli** sayılır; sonuç **kısmi faaliyet sonucu** olarak gösterilir. Vergi, amortisman ve girilmeyen giderler hesapta yoktur.
- Kira, personel, fatura ve diğer giderler tarihli kaydedilir; yıl/ay filtresi, gider listesi ve günlük sonuçlara yansır. Satış olmayan ancak gider bulunan günler de raporda görünür.
- Gün sonu özeti ürün adedi, ciro, sonuç ve ödeme saatlerini gösterir. Bir güne tıklamak o günü seçer.
- Tavsiyeler bugünden geriye iki 30 günlük dönemi karşılaştırır; en çok satan ürün, en az %30 azalan (önceki dönemde en az 5 satış olan) ürün ve düşük stok kartları gösterilir. Yıl filtresinden bağımsız güncel 60 günlük veriler kullanılır. Veri olmadığı dönemin kapalı veya kayıtsız olması da düşüşe yol açabilir; kartlar bir gözlem ve kontrol önerisidir.

Ekran görünürken veriler 30 saniyede bir ve kayıt sonrası yenilenir. Stok tüketimi bu yenilemeye bağlı değildir, veritabanında ödeme anında gerçekleşir.

## Erişim ve test

ERP tabloları RLS ile tarayıcı okumalarına ve yazmalarına kapalıdır. API her istekte JWT, aktif modül, işletme sahipliği ve yazmalarda kaynak / şema kontrolü yapar. Sunucu RPC ayrıca sahiplik ve aktif modülü kontrol eder. Güvenlik modeli [Supabase fonksiyon erişimi ve search_path önerilerini](https://supabase.com/docs/guides/database/functions) takip eder.

`node scripts/erp-test.mjs`, PGlite içindeki PostgreSQL motorunda gerçek migration ve tetikleyicileri çalıştırır. Canlı Supabase kullanılmaz. 100 L → 99,75 L örneği, tekrar işlem, kiracı ayrımı, rollback, ortalama maliyet, geçmiş maliyet, eksik maliyet, stok açığı, erişim kaldırma, özel tablo / RPC izinleri ve Türkiye günü raporları doğrulanır. Canlı SQL kurulumu ve gerçek ödeme akışı ayrıca kurulumdan sonra doğrulanmalıdır.
