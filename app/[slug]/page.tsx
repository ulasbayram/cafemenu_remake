import { db } from "@/lib/server";
import PublicMenu from "../public-menu";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await db()
    .prepare("SELECT * FROM cafes WHERE slug=?")
    .bind(slug)
    .first();
  if (!r) notFound();
  const c = JSON.parse(String(r.data));
  if (!c.published) notFound();
  return <PublicMenu cafe={{ ...c, id: r.id, createdAt: r.created_at }} />;
}
