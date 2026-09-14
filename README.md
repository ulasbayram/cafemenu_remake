# Fincan — QR Kafe Menü

Türkçe QR menü uygulaması. React 19 + Vinext (Workers üzerinde), Supabase (Postgres + Auth + Storage).

## Mimari

```
GitHub → Cloudflare Workers (vinext build, otomatik deploy)
              │  Bearer JWT (Supabase JWKS doğrulaması)
              ▼
        Supabase (Frankfurt)
         ├─ Auth: Google + şifre + e-posta bağlantısı
         ├─ Postgres: cafes (JSONB) / visits / rates + RLS
         └─ Storage: menu-images (logolar + ürün fotoğrafları)
```

Değişmez katman: veritabanı şeması, Storage, alan adı. Değişebilir katman:
compute (Workers ↔ Node), frontend çerçevesi, auth sağlayıcısı. Uygulama kodu
yalnızca web standartlarını kullanır (fetch, OIDC/JWT, Postgres, S3-benzeri depolama).

## Yerelde çalıştırma

Node 22.13+ gereklidir.

```sh
npm ci
cp .env.example .env   # değerleri doldurun (Supabase URL/anahtarları + DATABASE_URL)
npm run build
npm start              # http://127.0.0.1:8787
```

Veritabanı şemasını uygulayın: Supabase paneli → SQL Editor →
`supabase/migrations/0001_init.sql` ve ardından `0002_rpcs.sql` içeriğini
çalıştırın.

`http://localhost:8787/login` adresinden hesabınızı oluşturun (şifre veya
Google). Admin erişimi yalnızca normal kullanıcı girişinden sonra açılır; ayrı
bir admin giriş formu yoktur. Supabase → Auth → Users ekranında belirlenen iki
kullanıcının `app_metadata` alanına `{"role": "admin"}` ekleyin ve bu iki
kullanıcının UUID değerini `ADMIN_USER_IDS=id-1,id-2` şeklinde tanımlayın.
Uygulama hem imzalı token içindeki rolü hem de iki kişilik sunucu izin listesini
kontrol eder. Admin panelindeki “Destek için düzenle” seçeneği ürün ve tasarım
değişikliklerini aynı yetki kontrolüyle kaydeder.

## Doğrulama

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js app lib db
node scripts/editor-state-test.mjs && node scripts/logo-test.mjs && node scripts/social-links-test.mjs
```

## Yayın

1. Supabase projesi (Frankfurt) + Google OAuth + şifre doğrulama (min 12 karakter)
2. Migration: `supabase/migrations/0001_init.sql` (tablolar + RLS + Storage bucket)
3. GitHub repo → Actions secret'ları: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DOMAIN_NAME`,
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   ve iki admin UUID'sini içeren `ADMIN_USER_IDS`
4. Push → workflow typecheck + build + `wrangler deploy`
5. Alan adı: Cloudflare DNS → Workers custom domain

## Kimlik doğrulama

Şifreler, oturumlar ve rate limit Supabase Auth tarafından yönetilir
(uygulamada özel auth kodu yoktur). API'ler `Authorization: Bearer <JWT>`
bekler; JWT Supabase JWKS ile doğrulanır. Sahiplik kontrolü hem route
handler'larda hem de RLS politikalarında çift taraflı uygulanır.

## Notlar

- Ürün fotoğrafları ve logolar tarayıcıda küçültülüp (WebP) Supabase
  Storage'a yüklenir; RLS yalnızca sahibinin klasörüne yazmaya izin verir.
- QR adresleri sabittir: `/{kafe-slug}?table=N` masa bazlı QR üretir.
- Kur verisi ECB/Frankfurter'dan 6 saatlik önbellekle gelir; kesintide son
  bilinen kur "bayat" etiketiyle sunulur.
- Supabase ücretsiz katmanı ~1 hafta hareketsizlikte projeyi duraklatır;
  deploy workflow'u her çalışmada keep-alive isteği gönderir.
