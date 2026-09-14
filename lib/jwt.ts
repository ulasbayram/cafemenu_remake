import { svc } from "@/db";

export type SessionUser = {
  id: string;
  email: string;
  role: string | null;
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
    const role = data.user.app_metadata?.role;
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      role: typeof role === "string" ? role : null,
    };
  } catch {
    return null;
  }
}

/** Admin variant: requires both the signed role and the two-account allowlist. */
export async function verifyAdmin(
  request: Request,
): Promise<SessionUser | null> {
  const user = await verifyRequest(request);
  const allowlist = configuredAdminIds();
  return user?.role === "admin" && allowlist?.includes(user.id) ? user : null;
}

/** Exactly two account UUIDs form the server-side admin allowlist. */
export function configuredAdminIds(): string[] | null {
  const ids = [
    ...new Set(
      (env("ADMIN_USER_IDS") ?? "")
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return ids.length === 2 && ids.every((id) => uuid.test(id)) ? ids : null;
}
