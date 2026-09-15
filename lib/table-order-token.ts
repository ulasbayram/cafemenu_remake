function secret() {
  const globals = globalThis as unknown as Record<string, string | undefined>;
  const value =
    globals.FINCAN_TABLE_QR_SECRET ??
    globals.FINCAN_SUPABASE_SECRET_KEY ??
    process.env?.TABLE_QR_SECRET ??
    process.env?.SUPABASE_SECRET_KEY;
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

export async function signTableOrder(cafeId: string, table: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${cafeId}:${table}`),
    ),
  );
}

export async function verifyTableOrder(
  cafeId: string,
  table: number,
  token: string,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return token === (await signTableOrder(cafeId, table));
}
