import { createRemoteJWKSet, jwtVerify } from "jose";

export type SessionUser = {
  id: string;
  email: string;
  role: string | null;
};

type SupabaseClaims = {
  sub: string;
  email?: string;
  "app_metadata"?: Record<string, unknown>;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  const url = env("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  jwks ??= createRemoteJWKSet(
    new URL(`${url.replace(/\/+$/, "")}/auth/v1/.well-known/jwks.json`),
  );
  return jwks;
}

/** Small env reader that works on Workers and Node. */
export function env(name: string): string | undefined {
  const g = globalThis as unknown as Record<string, string | undefined>;
  return g[`FINCAN_${name}`] ?? process.env?.[name];
}

/**
 * Verifies the Authorization: Bearer JWT against Supabase's JWKS.
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
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${env("SUPABASE_URL")?.replace(/\/+$/, "")}/auth/v1`,
      audience: "authenticated",
    });
    const claims = payload as unknown as SupabaseClaims;
    const role = claims["app_metadata"]?.["role"];
    return {
      id: claims.sub,
      email: claims.email ?? "",
      role: typeof role === "string" ? role : null,
    };
  } catch {
    return null;
  }
}

/** Admin variant: null unless the JWT carries app_metadata.role = "admin". */
export async function verifyAdmin(
  request: Request,
): Promise<SessionUser | null> {
  const user = await verifyRequest(request);
  return user?.role === "admin" ? user : null;
}