import {
  scryptSync,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { cookies, headers } from "next/headers";
import { env } from "cloudflare:workers";
function authDb() {
  const binding = env.DB;
  if (!binding) throw new Error("Veritabanı bağlantısı hazır değil.");
  return binding;
}
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${scryptSync(password, salt, 32, options).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split(":");
  const valid =
    version === "scrypt-v1" &&
    /^[a-f0-9]{32}$/.test(salt || "") &&
    /^[a-f0-9]{64}$/.test(hash || "");
  const candidate = scryptSync(
    password,
    valid ? salt : "00000000000000000000000000000000",
    32,
    options,
  );
  return valid && timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function newSession() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: digest(token), expires: Date.now() + 14 * 86400000 };
}
export function sessionCookie(req: Request, token: string, remove = false) {
  const secure = new URL(req.url).protocol === "https:";
  return `${secure ? "__Host-" : ""}fincan_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${remove ? 0 : 14 * 86400}${secure ? "; Secure" : ""}`;
}
export type AppUser = { id: string; email: string; name: string };
export async function currentUser(): Promise<AppUser | null> {
  const jar = await cookies();
  const h = await headers();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h.get("host") || "");
  const token =
    jar.get("__Host-fincan_session")?.value ||
    (local ? jar.get("fincan_session")?.value : undefined);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const r = await authDb()
    .prepare(
      "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .bind(digest(token), Date.now())
    .first<AppUser>();
  return r || null;
}
export async function rateLimit(req: Request, email: string) {
  const now = Date.now(),
    keys = [
      { key: "email:" + digest(email), limit: 10 },
      {
        key: "ip:" + digest(req.headers.get("cf-connecting-ip") || "local"),
        limit: 50,
      },
    ];
  const results = await authDb().batch<{ count: number }>(
    keys.map((k) =>
      authDb()
        .prepare(
          "INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count",
        )
        .bind(k.key, now + 15 * 60000, now, now, now + 15 * 60000),
    ),
  );
  return results.every((r, i) => Number(r.results[0]?.count) <= keys[i].limit);
}
