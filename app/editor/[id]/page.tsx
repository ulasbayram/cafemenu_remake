import { currentUserFrom } from "@/lib/auth";
import { db } from "@/lib/server";
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    notFound();
  const rows =
    await db()`SELECT id, name, location, social, published, table_count, logo_url, data, created_at
               FROM cafes WHERE id = ${id} AND owner = ${user.id}`;
  const row = rows[0];
  if (!row) notFound();
  return (
    <MenuEditor
      initialCafe={{
        ...(row.data as object),
        name: row.name,
        location: row.location,
        socialLinks: row.social,
        published: row.published,
        tableCount: Number(row.table_count),
        logoUrl: row.logo_url ?? undefined,
        id: row.id,
        createdAt: new Date(row.created_at).toISOString(),
      } as never}
    />
  );
}