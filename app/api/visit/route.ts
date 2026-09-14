import { svc } from "@/db";
import { fail } from "@/lib/server";

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
    const client = svc();
    const { data: c } = await client
      .from("cafes")
      .select("id, published, table_count")
      .eq("id", cafe)
      .limit(1);
    if (!c?.[0] || !c[0].published) return new Response(null, { status: 404 });
    const cafeRow = c[0];
    const tableNo =
      typeof table === "number" &&
      Number.isInteger(table) &&
      table >= 1 &&
      table <= Number(cafeRow.table_count ?? 0)
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
    const { error } = await client
      .from("visits")
      .upsert(
        { cafe, day, visitor, hour, table_no: tableNo },
        { onConflict: "cafe,day,visitor", ignoreDuplicates: true },
      );
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";