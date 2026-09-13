import { z } from "zod";
import { cookies } from "next/headers";
import { db, sameOrigin, fail } from "@/lib/server";
import {
  hashPassword,
  verifyPassword,
  newSession,
  sessionCookie,
  digest,
  rateLimit,
} from "@/lib/auth";
import { getChatGPTUser } from "@/app/chatgpt-auth";
const credentials = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(12, "Şifreniz en az 12 karakter olmalı.")
    .max(128, "Şifreniz en fazla 128 karakter olabilir."),
  name: z.string().trim().min(2).max(80).optional(),
});
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    if (!sameOrigin(req))
      return Response.json(
        { error: "Geçersiz istek kaynağı." },
        { status: 403 },
      );
    const { action } = await params;
    if (action === "logout") {
      const jar = await cookies();
      const token =
        jar.get("__Host-fincan_session")?.value ||
        jar.get("fincan_session")?.value;
      if (token)
        await db()
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(digest(token))
          .run();
      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": sessionCookie(req, "", true),
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (!["register", "login"].includes(action))
      return new Response(null, { status: 404 });
    if (Number(req.headers.get("content-length")) > 4096)
      return Response.json({ error: "İstek çok büyük." }, { status: 413 });
    const raw = await req.text();
    if (raw.length > 4096) return new Response(null, { status: 413 });
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Geçersiz istek." }, { status: 400 });
    }
    const parsed = credentials.safeParse(payload);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const { email, password, name } = parsed.data;
    if (!(await rateLimit(req, email)))
      return Response.json(
        { error: "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    const existing = await db()
      .prepare("SELECT id,email,name,password_hash FROM users WHERE email=?")
      .bind(email)
      .first<{
        id: string;
        email: string;
        name: string;
        password_hash: string;
      }>();
    const session = newSession();
    let user;
    if (action === "register") {
      if (!name)
        return Response.json({ error: "Adınızı girin." }, { status: 400 });
      if (existing)
        return Response.json(
          {
            error: "Bu e-posta ile bir hesap zaten var. Giriş yapabilirsiniz.",
          },
          { status: 409 },
        );
      user = { id: crypto.randomUUID(), email, name };
      const hash = hashPassword(password);
      const legacy = await getChatGPTUser();
      const statements = [
        db()
          .prepare(
            "INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)",
          )
          .bind(user.id, email, name, hash, Date.now()),
        db()
          .prepare(
            "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
          )
          .bind(session.hash, user.id, session.expires),
      ];
      // Only migrate cafes owned by the independently authenticated legacy identity.
      if (legacy)
        statements.push(
          db()
            .prepare("UPDATE cafes SET owner=? WHERE owner=?")
            .bind(user.id, legacy.userId),
        );
      await db().batch(statements);
    } else {
      const ok = verifyPassword(password, existing?.password_hash || "");
      if (!existing || !ok)
        return Response.json(
          { error: "E-posta veya şifre hatalı." },
          { status: 401 },
        );
      user = { id: existing.id, email: existing.email, name: existing.name };
      await db()
        .prepare(
          "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
        )
        .bind(session.hash, user.id, session.expires)
        .run();
    }
    await db().batch([
      db().prepare("DELETE FROM sessions WHERE expires_at<=?").bind(Date.now()),
      db()
        .prepare("DELETE FROM auth_attempts WHERE expires_at<=?")
        .bind(Date.now()),
    ]);
    return Response.json(
      { user },
      {
        status: action === "register" ? 201 : 200,
        headers: {
          "Set-Cookie": sessionCookie(req, session.token),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
