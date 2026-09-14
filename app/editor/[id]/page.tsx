import { currentUserFrom } from "@/lib/auth";
import { asUser } from "@/db";
import { redirect, notFound } from "next/navigation";
import MenuEditor from "../menu-editor";
export const dynamic = "force-dynamic";
export default async function EditorPage({
  params,
  request,
}: {
  params: Promise<{ id: string }>;
  request: Request;
}) {
  const user = await currentUserFrom(request);
  if (!user) redirect("/login");
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  // Ownership enforced via user-scoped PostgREST call (RLS filters by owner).
  const token = request.headers.get("authorization")?.slice(7).trim();
  if (!token) redirect("/login");
  const { data: rows } = await asUser(token)
    .from("cafes")
    .select("id, name, location, social, published, table_count, logo_url, data, created_at")
    .eq("id", id)
    .limit(1);
  const row = rows?.[0];
  if (!row) notFound();
  return (
    <MenuEditor
      initialCafe={{
        ...((row.data ?? {}) as object),
        name: row.name,
        location: row.location,
        socialLinks: row.social,
        published: row.published,
        tableCount: Number(row.table_count),
        logoUrl: row.logo_url ?? undefined,
        id: row.id,
        createdAt: row.created_at,
      } as never}
    />
  );
}