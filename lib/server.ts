import { env } from "cloudflare:workers";
import { currentUser } from "./auth";
export function db() {
  if (!env.DB) throw new Error("Veritabanı bağlantısı hazır değil.");
  return env.DB;
}
export async function owner() {
  const u = await currentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u.id;
}
export function fail(e: unknown) {
  console.error(e);
  const auth = e instanceof Error && e.message === "UNAUTHORIZED";
  return Response.json(
    {
      error: auth
        ? "Devam etmek için giriş yapın."
        : "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    },
    { status: auth ? 401 : 500 },
  );
}
export function sameOrigin(r: Request) {
  return r.headers.get("origin") === new URL(r.url).origin;
}
