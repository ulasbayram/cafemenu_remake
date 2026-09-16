import { svc } from "@/db";

export type SessionUser = {
  id: string;
  email: string;
};

/** Small env reader that works on Workers and Node. */
export function env(name: string): string | undefined {
  const g = globalThis as unknown as Record<string, string | undefined>;
  return g[`FINCAN_${name}`] ?? process.env?.[name];
}

/**
 * Verifies the Authorization: Bearer JWT with Supabase Auth.
 * This supports both legacy HS256 projects and asymmetric signing keys.
 * Returns null for missing/invalid tokens — callers decide auth failure.
 */
export async function verifyRequest(
  request: Request,
): Promise<SessionUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || token.length > 4096) return null;
  try {
    const { data, error } = await svc().auth.getUser(token);
    if (error || !data.user) {
      console.warn("Supabase token verification failed", {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      });
      return null;
    }
    return {
      id: data.user.id,
      email: data.user.email ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Admin check: the caller's user id must exist in the `admins` table.
 * The table is managed by owners directly in the Supabase dashboard
 * (INSERT/DELETE) — no redeploys, no env vars. RLS-blocked for everyone
 * else; only the service client reads it.
 */
export async function verifyAdmin(
  request: Request,
): Promise<SessionUser | null> {
  const user = await verifyRequest(request);
  if (!user) return null;
  const { data, error } = await svc()
    .schema("public")
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1);
  if (error) {
    console.warn("Admin check failed", error.message);
    return null;
  }
  return data?.length ? user : null;
}