# Fincan Gizlilik Politikası (Privacy Policy)

**Hizmet sağlayıcı:** Hibrit  
**Uygulama:** Fincan  
**Web sitesi:** https://fincan.hibrit.dev  
**Son güncelleme:** 10 Ekim 2026  
**Gizlilik ve kişisel veri başvuruları için iletişim adresi:** ____________________

## 1. Kapsam ve veri işleme rolleri

Bu politika, Fincan'ın işletme hesabı sahipleri ve yetkili kullanıcıları ile QR menü ziyaretçilerine ilişkin verileri nasıl topladığını, kullandığını, sakladığını ve paylaştığını açıklar. Fincan, Hibrit tarafından sunulan bir QR menü ve işletme yönetimi uygulamasıdır.

Hibrit; Fincan hesaplarının oluşturulması, oturum güvenliği, uygulamanın işletilmesi ve kendi hizmet yönetimi için amaç ve yöntemlerini belirlediği işlemlerde veri sorumlusu olarak hareket eder. Bir işletmenin müşteri siparişlerini yönetmesi ve kendi menü/işletme içeriğini yayımlaması bakımından ilgili işletmenin de veri sorumluluğu bulunabilir. Hibrit'in işletme talimatıyla yürüttüğü işlemlerde veri işleyen rolü, ilgili hizmet ilişkisi ve fiilî işleme göre belirlenir. Siparişin hazırlanması, ödeme, fiş/fatura veya işletmenin Fincan dışında topladığı bilgiler için ayrıca işletmenin açıklamaları geçerlidir.

Bu politika, üçüncü taraf bağlantılarından açılan Google, sosyal ağlar, WhatsApp veya işletme web sitelerinin kendi veri işleme faaliyetlerini kapsamaz.

## 2. İşletme hesapları için işlenen bilgiler

### 2.1. Google ile giriş

Google ile devam etmeyi seçtiğinizde kimlik doğrulaması Google ve Supabase Auth üzerinden gerçekleştirilir. Temel kimlik doğrulama kapsamında Google hesap kimliği, e-posta adresi ve doğrulanma bilgisi, ad/profil adı ve Google'ın sağladığı profil bilgileri alınabilir. Profil fotoğrafı adresi de Google'ın kimlik verileri kapsamında Supabase Auth kayıtlarında veya oturum verilerinde bulunabilir.

Fincan, e-posta ve kullanıcı kimliğini hesapla eşleştirme ve erişim denetimi için; ad/profil adını yönetim ekranında sizi tanımak ve göstermek için kullanır. Mevcut arayüz Google profil fotoğrafını kullanıcı avatarı olarak göstermemektedir. Kimlik sağlayıcısı bilgileri, hesap oluşturulma ve son giriş zamanları ile oturum bilgileri Supabase Auth tarafından yönetilir.

Google şifreniz Fincan'a verilmez. Fincan'ın mevcut Google giriş özelliği Gmail iletilerine, Google Drive dosyalarına, kişilerinize veya takviminize erişim istemez ve bu içerikleri okumaz. Google verileri kimlik doğrulama, hesap yönetimi, güvenlik ve ilgili kullanıcıya sunulan özellikler için kullanılır; reklam hedefleme, veri satışı veya yapay zekâ modeli eğitimi amacıyla kullanılmaz.

Fincan'ın Google'dan aldığı bilgileri kullanması ve aktarması, [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) hükümlerine ve uygulanabildiği ölçüde Limited Use gerekliliklerine uygun şekilde yürütülür.

### 2.2. E-posta, şifre ve giriş bağlantıları

E-posta ve şifreyle hesap oluşturduğunuzda e-posta adresiniz ve doğrulama bilgileri Supabase Auth'a iletilir. Şifre doğrulamasını Supabase Auth yönetir; şifre Fincan'ın işletme ve sipariş tablolarına kaydedilmez. E-posta ile giriş bağlantısı istediğinizde e-posta adresiniz bağlantının gönderilmesi ve hesabın doğrulanması için işlenir. E-posta doğrulama, giriş ve güvenlik mesajları bu işlemlerin parçasıdır; mevcut uygulamada pazarlama e-postası aboneliği bulunmaz.

### 2.3. İşletme, menü ve yüklenen içerikler

Hesapla bağlantılı kullanıcı kimliği, işletme adı, menü adresi, konum açıklaması, masa sayısı, yayın durumu, işletme koordinatları, sosyal medya ve web bağlantıları, isteğe bağlı WhatsApp hattı, Google yorum bağlantısı, logo, ürün fotoğrafları, ürün adları, açıklamaları, fiyatları, kategorileri, etiketleri, uygunluk durumu ve tasarım tercihleri işlenir. Kayıt oluşturma ve güncelleme zamanları da saklanır.

Logo ve ürün fotoğrafları tarayıcıda boyut ve format bakımından işlenerek Supabase Storage'a yüklenir. Metinden menü aktarımı, mevcut uygulamada tarayıcıda metin ayrıştırma yoluyla yapılır; elde edilen ürün verileri kaydedildiğinde sunucuya gönderilir. Bu özellik için harici bir yapay zekâ veya OCR servisine menü metni gönderilmez.

## 3. Menü ziyaretçileri için işlenen bilgiler

### 3.1. Ziyaret sayımı

Bir yayımlanmış menüyü açtığınızda tarayıcınız için rastgele bir kimlik oluşturulur ve `fincan-visitor` adıyla yerel depolamaya kaydedilir. Sunucuya işletme kimliği, ziyaretçi kimliği ve varsa masa numarası gönderilir. Ziyaret kaydında işletme, gün, saat ve varsa masa numarası tutulur. Aynı işletmede aynı gün aynı kimlik için tek ziyaret kaydı oluşturulur.

Bu kimlik aynı site kapsamındaki farklı menülerde ve farklı günlerde kullanılabilir. Adınız veya e-posta adresiniz doğrudan istenmese de kimlik tekrar eden ziyaretleri ilişkilendirebildiğinden bu kayıtlar tamamen anonim olarak değerlendirilmez. İşletme yönetim ekranında ziyaretler toplulaştırılmış istatistikler olarak sunulur; altyapıda kimliği içeren ham ziyaret kayıtları bulunur.

### 3.2. Masa siparişleri

Sipariş gönderdiğinizde işletme ve masa bilgisi, seçilen ürünler ve miktarları, QR sipariş doğrulama bilgisi, gerekiyorsa günlük kod ve ziyaretçi kimliği işlenir. Sipariş kaydına sipariş kimliği, işletme, masa numarası, ürün kimlikleri ve adları, miktarlar, birim fiyatlar, toplam tutar, durum ve oluşturulma/güncellenme zamanları kaydedilir. Uygulanabildiğinde yaklaşık uzaklık ve uzaklığın cihaz konumundan mı IP bilgisinden mi hesaplandığı da saklanır.

Mevcut sipariş tablosuna ziyaretçi kimliği eklenmez; bu kimlik ziyaret sayımı ve istek sınırlandırma işlemlerinde kullanılır. Sipariş vermek için ziyaretçinin adı, e-posta adresi, telefon numarası, teslimat adresi veya kart bilgisi istenmez. İşletmenin WhatsApp bağlantısı veya başka bir kanal üzerinden sizden ayrıca bilgi istemesi bu kanalların ve ilgili işletmenin veri işleme faaliyetidir.

### 3.3. Konum ve yaklaşık uzaklık

Sipariş sepetini açarken tarayıcınız cihaz konumunuza erişim izni isteyebilir. İzin verirseniz enlem ve boylam, ilgili sipariş gönderilirken sunucuya iletilir ve işletmeye uzaklığınız hesaplanır. İzin vermeden de mevcut sipariş işlevini kullanabilirsiniz. Tarayıcı konum izni, kişisel veri işlemeye yönelik ayrı bir hukuki açık rızanın gerektiği durumlarda onun yerine geçmez.

Cihaz konumu verilmezse ve altyapı bu bilgiyi sağlıyorsa Cloudflare'ın IP temelli yaklaşık konum bilgisi uzaklık hesabında kullanılabilir. İşletme koordinatları tanımlanmamışsa uzaklık hesaplanmaz. Sipariş veritabanında ziyaretçinin enlem ve boylamı yerine tam kilometreye yuvarlanmış uzaklık ve `gps` veya `ip` kaynağı tutulur. Bu açıklama, ağ ve altyapı sağlayıcılarının kendi teknik kayıtlarında hiçbir konum veya IP bilgisi işlemediği anlamına gelmez.

İşletme kullanıcısının “Bu konumdayım” seçeneğiyle kaydettiği **işletme koordinatları ise saklanır**. İşletme verisi yayımlanmış menüye aktarılabildiğinden işletmenin kayıtlı koordinatlarını gizli bilgi olarak girmeyiniz. Uzaklık işletmeye bilgi sağlar; mevcut kod bu uzaklık üzerinden siparişi otomatik reddetmez.

## 4. Teknik veriler, tarayıcı depolaması ve çerezler

Fincan'a erişim sırasında IP adresi, istek zamanı, istek adresi ve bağlantı/tarayıcı bilgileri Google, Supabase veya Cloudflare tarafından bağlantıyı kurma, hizmeti sunma ve güvenlik amacıyla işlenebilir. Kimlik doğrulama ve sunucu hatalarına ilişkin teknik kayıtlar oluşabilir. Fincan'ın kendi ziyaret ve sipariş tablolarında ham IP veya tarayıcı kullanıcı aracısı alanı bulunmaz.

| Tarayıcıdaki veri | Kullanım amacı | Süre ve kontrol |
| --- | --- | --- |
| Supabase oturum ve doğrulama verileri | Oturumu sürdürme, erişim ve yenileme tokenları, giriş akışını tamamlama; sağlayıcı oturum verileri de bulunabilir | Tokenların geçerliliği oturum ayarlarına bağlıdır. Yerel kayıtlar oturum kapatma veya site verilerini temizleme ile kaldırılabilir; tüm cihaz oturumları aynı anda sona ermeyebilir. |
| `fincan-visitor` | Tekrar eden menü ziyaretlerini sayma ve sipariş isteklerini sınırlandırma | Uygulama tarafından otomatik son kullanma süresi atanmaz; site verileri temizlenene veya tarayıcı kaldırana kadar kalabilir. |
| `fincan-theme`, `fincan-menu-theme` | Açık/koyu görünüm tercihini hatırlama | Uygulama tarafından otomatik son kullanma süresi atanmaz; tercih değiştirilebilir veya site verileri temizlenebilir. |
| Sepet ve seçilen masa | Açık menüde sipariş hazırlama | Mevcut uygulamada sayfanın çalışma belleğinde tutulur; kalıcı sepet kaydı oluşturulmaz. |

Yerel depolama, çerezle aynı teknik mekanizma değildir; ikisi de tarayıcıda bilgi tutulmasını sağlar. Google ile girişte Google kendi oturum mekanizmalarını kullanabilir. Mevcut Fincan uygulama kodunda reklam çerezi, Google Analytics, reklam pikseli veya üçüncü taraf davranış takibi entegrasyonu bulunmaz. Menü ziyaretleri için yukarıda açıklanan kendi istatistik sistemi kullanılır.

Tarayıcı ayarlarından site verilerini temizleyebilirsiniz. Bu işlem oturumunuzu ve tercihlerinizi kaldırabilir ve sonraki ziyarette yeni ziyaretçi kimliği oluşmasına yol açabilir; daha önce sunucuda oluşmuş kayıtları kendiliğinden silmez. Mevcut arayüzde ziyaret sayımını kapatan ayrı bir tercih anahtarı bulunmaz.

## 5. Amaçlar ve hukuki sebepler

Verileriniz hesap oluşturmak ve doğrulamak, işletme ve menü hizmetini sunmak, siparişi işletmeye iletmek, istatistik sağlamak, kötüye kullanımı azaltmak, teknik destek vermek ve hukuki yükümlülükleri yerine getirmek için işlenir. Toplama; sizin form ve yüklemeleriniz, Google kimlik doğrulaması, tarayıcıdaki yerel depolama, uygulama API istekleri ve altyapı sağlayıcıları üzerinden elektronik olarak gerçekleşir.

| İşlem | Uygulanabilir hukuki sebep |
| --- | --- |
| Hesap, oturum, işletme yönetimi ve kullanıcının talep ettiği hizmetin sunulması | Sözleşmenin kurulması veya ifası için gerekli işleme; KVKK m. 5/2(c). |
| Siparişin iletilmesi ve işletmenin siparişi yönetmesi | İlgili sözleşmenin kurulması veya ifası için gerekli işleme; tarafların veri işleme rolleri ayrıca dikkate alınır. |
| Güvenlik, yetki kontrolü ve kötüye kullanımın önlenmesi | Temel hak ve özgürlüklere zarar vermemek şartıyla meşru menfaat; KVKK m. 5/2(f). |
| Ziyaret istatistikleri | Meşru menfaat şartları ve tarayıcıda bilgi depolamaya ilişkin kurallar ayrıca değerlendirilir; gerekli hâllerde önceden açık rıza alınır. |
| İsteğe bağlı hassas cihaz konumuyla uzaklık hesabı | Uygulanabilir şartlara göre ayrıca açık rıza; KVKK m. 5/1. IP temelli uzaklık sinyali için güvenlik amacı ve meşru menfaat şartları ayrıca değerlendirilir. |
| Yasal talepler ve hukuki uyuşmazlıklar | Hukuki yükümlülük ve/veya bir hakkın tesisi, kullanılması veya korunması; KVKK m. 5/2(ç) ve m. 5/2(e). |

Gerekli olmayan verileri paylaşmamanız, isteğe bağlı bilgileri boş bırakmanız veya cihaz konum iznini reddetmeniz mümkündür. Bir işlemin açık rızaya dayanması gerekiyorsa bu politika veya kullanım koşullarının kabulü tek başına o rızanın alındığı anlamına gelmez. Açık rıza gereken işleme için ayrı ve uygun bilgilendirme ile rıza süreci uygulanmalıdır.

## 6. Veriler kimlerle paylaşılır?

- **Supabase:** Hesap ve oturum yönetimi, veritabanı, işletme/menü/ziyaret/sipariş kayıtları ve görsel depolama için kullanılır.
- **Cloudflare:** Web uygulamasının çalıştırılması, içerik sunumu, ağ güvenliği, istek sınırlandırma ve mevcut olduğunda IP temelli yaklaşık konum verisi için kullanılır. Ziyaretçi kimliği istek sınırlandırma hizmetine iletilebilir.
- **Google:** Google ile giriş işlemini yürütür. Google kendi hizmetleri bakımından kendi koşul ve gizlilik açıklamalarına tabidir.
- **İlgili işletme:** Sipariş içeriği, masa, tutar, zaman, durum ve varsa yaklaşık uzaklık bilgilerini görür. Ziyaret istatistikleri işletme hesabında görüntülenir. Sahiplik yetkileri çerçevesinde altyapıda işletmenin ziyaret kayıtlarına erişim de mümkündür.
- **Yetkili Hibrit yöneticileri:** Kullanıcı kimliği, e-posta, hesap oluşturma ve son giriş zamanı, ilişkili işletmeler, menü bilgileri ve istatistiklere hizmet yönetimi, destek ve güvenlik amaçlarıyla erişebilir. Destek düzenlemesinin zamanı ve yapan yöneticinin kimliği işletme kaydında tutulabilir.
- **Kamuya açık menü kullanıcıları:** Yayımlanan menü/işletme içeriğini, isteğe bağlı bağlantıları ve herkese açık görselleri görüntüleyebilir. Hesap e-postanız sırf Google ile giriş yaptığınız için menüde yayımlanmaz.
- **Yetkili merciler:** Geçerli hukuki yükümlülük ve talepler kapsamında, gereken ölçüde veri paylaşılabilir.

Kur dönüşümü için Frankfurter/ECB kaynaklı veriler sunucudan alınır. Mevcut bu istekte hesap, ziyaretçi veya sipariş verisi kur sağlayıcısına gönderilmez. Harici web, sosyal medya, WhatsApp veya Google yorum bağlantısına tıkladığınızda ilgili servis kendi verilerini işleyebilir. İşletmenin harici bir sunucuda barındırdığı görseli görüntülemeniz hâlinde tarayıcınız o sunucuya istek gönderebilir.

Fincan kapsamında kişisel verileri satmayız veya reklam hedefleme amacıyla üçüncü kişilere aktarmayız.

## 7. Herkese açık içerik ve görsel depolama

Logo ve ürün görselleri Supabase'ın herkese açık `menu-images` depolama alanında sunulur. Dosya adresine sahip kişiler görsele erişebilir; adresler yükleyen kullanıcının teknik kimliğini de içerebilir. Menü yayından kaldırıldığında ayrı görsel dosyaları otomatik olarak silinmez. Yalnızca yayımlama hakkınız olan görselleri yükleyiniz.

İşletme konum açıklaması, isteğe bağlı iletişim bağlantıları ve menüye girilen diğer bilgiler herkese açık olabilir. Üçüncü kişilerin ekran görüntüsü, indirme, önbellek veya başka yollarla oluşturduğu kopyalar Fincan'ın doğrudan kontrolünde değildir.

## 8. Verilerin saklandığı ortamlar ve yurt dışı işlemler

Fincan, Supabase ve Cloudflare altyapısı ile Google kimlik doğrulamasından yararlanır. Bu hizmetlerin sunucuları ve alt hizmet sağlayıcıları Türkiye dışında bulunabilir; hizmetin sunulması sırasında kişisel verilerin yurt dışında işlenmesi veya yurt dışından erişilebilir olması söz konusu olabilir.

Veritabanı konumu, yedekler, teknik kayıtlar ve sağlayıcı erişimleri hizmet sağlayıcılarının proje, plan ve hesap ayarlarına bağlıdır. Tek bir bölgedeki veritabanı seçimi bütün sağlayıcı verilerinin yalnızca aynı ülkede işlendiği anlamına gelmez.

Yurt dışına aktarım, KVKK m. 9 ve uygulanabilir diğer kurallara göre uygun aktarım şartı ve güvencelerin değerlendirilmesini gerektirir. Google ile giriş yapmak, bu politikayı okumak veya kullanım koşullarını kabul etmek tek başına genel bir yurt dışı aktarım rızası değildir. Sağlayıcıların standart hizmet sözleşmelerinin varlığı, KVKK kapsamındaki aktarım gerekliliklerinin kendiliğinden tamamlandığı anlamına gelmez.

## 9. Saklama ve silme

Veriler, toplandıkları amaç ve uygulanabilir hukuki yükümlülükler bakımından gerekli süreyle sınırlı tutulmalıdır. Hesap bilgileri ve işletme içeriği hizmet ilişkisinin devamı için; ziyaret ve sipariş kayıtları istatistik, işletme yönetimi ve ilgili hakların korunması için; teknik güvenlik kayıtları güvenlik ve sorun incelemesi için değerlendirilir.

Mevcut uygulama kodu hesap, ziyaret, sipariş veya istek sınırlandırma kayıtlarını belirli bir gün sayısı dolunca otomatik silen bir süreç içermemektedir. İstatistik ekranının son 30 günlük verileri göstermesi daha eski ziyaret kayıtlarının silindiği anlamına gelmez. Kayıtlar talep üzerine veya işletim süreci kapsamında ayrıca silinmediğinde veritabanında kalabilir; bu teknik durum sınırsız saklama için hukuki dayanak oluşturmaz.

Tarayıcıdaki ziyaretçi kimliği ve tema tercihleri için uygulama tarafından otomatik son kullanma süresi atanmaz. Oturum tokenlarının geçerlilik süreleri Supabase ayarlarına bağlıdır. Altyapı kayıtları ve varsa yedeklerin saklama süreleri ilgili sağlayıcının ayarlarına ve hizmet planına bağlıdır.

Bir hesabın gerçekten silinmesi hâlinde ilişkili işletme, ziyaret ve sipariş kayıtları veritabanı ilişkileri nedeniyle zincirleme silinebilir. Görsel depodaki dosyalar ve ziyaretçi kimliği içeren istek sınırlandırma kayıtları için ayrıca temizleme gerekir. Menü yayından kaldırma, Google erişimini kaldırma veya tarayıcı verilerini temizleme, sunucudaki bütün kayıtları silen bir işlem değildir.

Silme taleplerinde hesap sahipliği ve ilgili kayıtlar doğrulanır; işleme şartları ortadan kalkmış veriler için silme, yok etme veya anonimleştirme uygulanabilir. Bir kaydın hukuki zorunluluk nedeniyle tutulması gerekiyorsa talep ve saklama gerekçesi ayrıca değerlendirilir. Yedeklerdeki silmenin zamanı ve kapsamı teknik yaşam döngüsüne bağlıdır; anında tüm yedeklerden silme garantisi verilmez.

## 10. Veri güvenliği

Fincan, Supabase kimlik doğrulaması, API token doğrulaması, işletme sahipliği kontrolleri ve veritabanı satır düzeyi erişim politikalarından yararlanır. Yönetici erişimi yetki kontrolüne bağlıdır. Görsel yükleme yetkileri kullanıcı klasörlerine göre sınırlandırılır; görsellerin herkese açık sunumu ise bilinçli bir hizmet özelliğidir.

Hiçbir internet hizmeti mutlak güvenlik sağlayamaz. Cihazınızı, e-posta/Google hesabınızı ve oturum bilgilerinizi koruyunuz. Güvenlik ihlali şüphesi için Hibrit'in iletişim kanalına başvurabilirsiniz. Hibrit'in uygulanabilir mevzuattaki güvenlik ve ihlal bildirimi yükümlülükleri saklıdır.

## 11. Haklarınız ve başvuru

KVKK m. 11 kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarım yapılan üçüncü kişileri bilme, eksik veya yanlış verilerin düzeltilmesini isteme, kanuni şartlar kapsamında silme/yok etme isteme, düzeltme ve silme işlemlerinin alıcılara bildirilmesini isteme, münhasıran otomatik analiz sonucu aleyhinize bir sonuca itiraz etme ve hukuka aykırı işleme nedeniyle zarar doğmuşsa giderim talep etme haklarınız vardır.

Gizlilik, erişim veya hesap kapatma talebinizi bu sayfadaki Hibrit iletişim adresine gönderebilirsiniz. Hesap işlemleri için mümkünse kayıtlı e-posta adresinizden yazınız. Ziyaret veya sipariş taleplerinde ilgili menü adresi, tarih ve varsa sipariş numarası kayıtların bulunmasına yardımcı olur. Tarayıcıda tutulan ziyaretçi kimliği ilgili kayıtların eşleştirilmesi için ayrıca gerekebilir. Şifrenizi veya erişim tokenınızı göndermeyiniz.

Resmî KVKK başvuruları, yürürlükteki başvuru usulüne uygun şekilde yazılı veya izin verilen elektronik yöntemlerle yapılabilir. Talebin niteliğine uygun ve ölçülü kimlik doğrulaması istenebilir. Usulüne uygun başvurular en kısa sürede ve en geç 30 gün içinde sonuçlandırılır; ret hâlinde gerekçe bildirilir. Kanunun tanıdığı Kurula şikâyet ve diğer başvuru hakları saklıdır.

Mevcut uygulamada kullanıcı panelinde otomatik hesap silme düğmesi yoktur. Google hesabınızın üçüncü taraf bağlantıları bölümünden Fincan bağlantısını kaldırabilirsiniz; bu işlem geçmiş Fincan kayıtlarını silmez. Kayıtların silinmesi için ayrıca Hibrit'e başvurunuz. İşletmenin kendi müşteri kayıtları veya Fincan dışındaki işlemleri için ilgili işletmeye de başvurmanız gerekebilir.

## 12. Çocuklar ve isteğe bağlı bilgiler

Fincan'ın işletme yönetimi hesapları yetişkin ve yetkili işletme kullanıcılarına yöneliktir. Menü görüntülemek için hesap açılması veya Google ile giriş yapılması gerekmez. Uygulama yaş/doğum tarihi alanı içermez; çocuklara ait kimlik, fotoğraf veya başka gereksiz kişisel verileri menü içeriğine eklemeyiniz. Çocuklara ilişkin uygunsuz veri işlendiğini düşünüyorsanız Hibrit'e bildirebilirsiniz.

## 13. Politika değişiklikleri ve iletişim

Bu politikadaki değişiklikler son güncelleme tarihiyle birlikte yayımlanır. İşleme amaçları, Google verilerinin kullanımı veya veri paylaşımı konusunda esaslı bir değişiklik olduğunda uygun şekilde bilgilendirme yapılır; yeni işlem için gerekli rıza veya diğer hukuki şartlar ayrıca sağlanır.

**Veri sorumlusu / hizmet sağlayıcı:** Hibrit  
**Web sitesi:** https://fincan.hibrit.dev  
**Gizlilik, KVKK başvuruları ve hesap silme iletişim adresi:** ____________________
