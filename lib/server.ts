import { db } from "@/db";
import { verifyRequest } from "@/lib/jwt";

export { db };
export type Sql = Awaited<ReturnType<typeof db>>;

/** Throws UNAUTHORIZED if no valid user token; returns the user id. */
export async function owner(request: Request): Promise<string> {
  const user = await verifyRequest(request);
  if (!user) throw new Error("UNAUTHORIZED");
  return user.id;
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