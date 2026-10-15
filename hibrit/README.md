# Hibrit

Hibrit firmasının bağımsız tanıtım sitesi. Bu klasörün tamamı tek başına bir Git
deposuna veya başka bir proje klasörüne kopyalanabilir. Üst klasördeki Fincan
uygulamasına, React/Next.js paketlerine, Supabase'e veya herhangi bir gizli anahtara
bağlı değildir. Görseller, ikonlar ve lisanslarıyla birlikte fontlar dahildir.

## Başka projeye taşıma

1. `hibrit/` klasörünün **içeriğini**, gizli `.gitignore` dosyası dahil, yeni
   deponun köküne kopyalayın. Fincan'ın diğer dosyalarını kopyalamayın.
2. Node.js 22.13 veya üzeriyle aşağıdaki komutları yeni depo kökünde çalıştırın.
3. Yeni projeyi kendi yayın hizmetine bağlayın ve `hibrit.dev` alan adını ona atayın.

## Yerel önizleme

```sh
npm run dev
```

Adres: http://localhost:5174. Paket bağımlılığı yoktur; `npm install` gerekmez.
Portu `PORT` ortam değişkeniyle değiştirebilirsiniz.

## Yayına hazırlama

```sh
npm run build
npm run preview
```

Yayınlanacak klasör `dist/` dizinidir. Site statik HTML, CSS ve JavaScript'ten
oluşur; sunucu taraflı uygulama çalışma zamanı gerekmez. Statik yayın hizmetinde
build komutu `npm run build`, çıktı dizini `dist` olarak ayarlanır.
Fincan deposundan doğrudan yayınlanacaksa proje kökü `hibrit` seçilir.

Cloudflare Pages kullanılıyorsa yeni bir Pages projesi oluşturup bu ayarları
kullanın; `hibrit.dev` özel alan adını **bu projeye** bağlayın.
`fincan.hibrit.dev`, mevcut Fincan projesinde kalmalıdır.
Bu klasörü oluşturmak canlı DNS veya yayın ayarlarını değiştirmez.

## Düzenleme

- `index.html`: metinler, sayfa bölümleri ve arama motoru/sosyal paylaşım bilgileri.
- `styles.css`: duyarlı tasarım, renkler ve yerel font tanımları.
- `main.js`: iletişim formu davranışı ve telif yılı.
- `assets/brand/`: Hibrit logosu ve site ikonu.
- `assets/products/`: Fincan ürün ekranı; Fincan bağlantıları dış bağlantıdır.
- `assets/fonts/`: yerel fontlar ve lisansları.

İletişim formu, alıcı adresi kullanıcı tarafından daha sonra belirleneceği için
**mesaj göndermez ve bilgi kaydetmez**. Kullanıcıya bu durum belirtilir. Gerçek
gönderim eklenirken `main.js` içindeki form dinleyicisi bir sunucu veya form
hizmetine bağlanmalı; gizli e-posta servis anahtarları tarayıcı koduna yazılmamalıdır.
