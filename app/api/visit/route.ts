import { db, fail, sameOrigin } from "@/lib/server";
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return new Response(null, { status: 403 });
    const { cafe, visitor } = (await req.json()) as {
      cafe: string;
      visitor: string;
    };
    if (
      typeof visitor !== "string" ||
      !/^[a-f0-9-]{36}$/.test(visitor) ||
      typeof cafe !== "string"
    )
      return new Response(null, { status: 400 });
    const c = await db()
      .prepare("SELECT data FROM cafes WHERE id=?")
      .bind(cafe)
      .first();
    if (!c || !JSON.parse(String(c.data)).published)
      return new Response(null, { status: 404 });
    const now = new Date(),
      day = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }),
      hour = Number(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
        }),
      );
    await db()
      .prepare(
        "INSERT OR IGNORE INTO visits (cafe,day,visitor,hour) VALUES (?,?,?,?)",
      )
      .bind(cafe, day, visitor, hour)
      .run();
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
