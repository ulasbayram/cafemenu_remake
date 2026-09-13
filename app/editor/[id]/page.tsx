import { currentUser } from "@/lib/auth";
import { db } from "@/lib/server";
import { redirect, notFound } from "next/navigation";
import MenuEditor from "../menu-editor";
export const dynamic = "force-dynamic";
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const row = await db()
    .prepare("SELECT id,data,created_at FROM cafes WHERE id=? AND owner=?")
    .bind(id, user.id)
    .first();
  if (!row) notFound();
  return (
    <MenuEditor
      initialCafe={{
        ...JSON.parse(String(row.data)),
        id: row.id,
        createdAt: row.created_at,
      }}
    />
  );
}
