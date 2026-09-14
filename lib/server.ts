import { asUser, isUniqueViolation } from "@/db";
import { verifyRequest } from "@/lib/jwt";

/** Verifies the Bearer JWT; returns the user id or throws UNAUTHORIZED. */
export async function owner(request: Request): Promise<string> {
  const user = await verifyRequest(request);
  if (!user) throw new Error("UNAUTHORIZED");
  return user.id;
}

/** Raw Authorization header value (for user-scoped Supabase clients). */
export function userJwt(request: Request): string {
  return request.headers.get("authorization")?.slice(7).trim() ?? "";
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
  const origin = r.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(r.url).origin;
}

export { asUser, isUniqueViolation };