function secret() {
  const globals = globalThis as unknown as Record<string, string | undefined>;
  const value = globals.FINCAN_TABLE_QR_SECRET ?? process.env?.TABLE_QR_SECRET;
  if (!value) throw new Error("TABLE_QR_SECRET is not configured.");
  return value;
}

function base64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 12 base64url chars = 72 bits. Brute force at 100 req/s ≈ 10^16 years; with
// rate limits it's unreachable. Keeps QR payloads small for logo embedding.
const TOKEN_LENGTH = 12;

export async function signTableOrder(cafeId: string, table: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${cafeId}:${table}`),
  );
  return base64Url(mac).slice(0, TOKEN_LENGTH);
}

export async function verifyTableOrder(
  cafeId: string,
  table: number,
  token: string,
) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{12}$/.test(token))
    return false;
  return token === (await signTableOrder(cafeId, table));
}
/** Istanbul-day-bucketed daily order code: HMAC(secret, "daily:cafeId:date")
 * → 4 chars, uppercase. Same secret as table tokens; different message. */
export async function dailyCodeFor(cafeId: string): Promise<string> {
  const day = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul",
  });
  const mac = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    new TextEncoder().encode(`daily:${cafeId}:${day}`),
  );
  return base64Url(mac)
    .slice(0, 4)
    .toUpperCase();
}
