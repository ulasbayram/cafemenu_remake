import { db, fail } from "@/lib/server";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return new Response(null, { status: 403 });
    const { cafe, visitor, table } = (await request.json()) as {
      cafe: string;
      visitor: string;
      table?: number;
    };
    if (
      typeof visitor !== "string" ||
      !/^[0-9a-f-]{36}$/.test(visitor) ||
      typeof cafe !== "string" ||
      !/^[0-9a-f-]{36}$/.test(cafe)
    )
      return new Response(null, { status: 400 });
    const sql = db();
    const [c] = await sql`
      SELECT id, published, table_count FROM cafes WHERE id = ${cafe} LIMIT 1`;
    if (!c || !c.published) return new Response(null, { status: 404 });
    // Validate table attribution: 1..table_count, else drop to NULL.
    const tableNo =
      typeof table === "number" &&
      Number.isInteger(table) &&
      table >= 1 &&
      table <= Number(c.table_count ?? 0)
        ? table
        : null;
    const now = new Date(),
      day = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }),
      hour = Number(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
        }),
      );
    await sql`
      INSERT INTO visits (cafe, day, visitor, hour, table_no)
      VALUES (${cafe}, ${day}, ${visitor}, ${hour}, ${tableNo})
      ON CONFLICT (cafe, day, visitor) DO NOTHING`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";