import { z } from "zod";
import { asUser, owner, userJwt, fail } from "@/lib/server";
import { dailyCodeFor } from "@/lib/table-order-token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Today's daily order code for one of the caller's cafes (token+daily mode). */
export async function GET(request: Request) {
  try {
    await owner(request);
    const { searchParams } = new URL(request.url);
    const cafe = searchParams.get("cafe");
    if (!cafe || !UUID.test(cafe))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const { data, error } = await asUser(userJwt(request))
      .from("cafes")
      .select("id")
      .eq("id", cafe)
      .limit(1);
    if (error) throw error;
    if (!data?.length)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const { code } = (await z
      .object({ code: z.string() })
      .parseAsync({ code: await dailyCodeFor(cafe) })) as { code: string };
    return Response.json({ code });
  } catch (error) {
    return fail(error);
  }
}
export const dynamic = "force-dynamic";