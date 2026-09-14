import { db } from "@/lib/server";
import PublicMenu from "../public-menu";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table: tableParam } = await searchParams;
  const sql = db();
  const rows =
    await sql`SELECT id, name, location, social, published, table_count, logo_url, data, created_at
              FROM cafes WHERE slug = ${slug} LIMIT 1`;
  const r = rows[0];
  if (!r) notFound();
  const c = r.data as Record<string, unknown>;
  if (!c.published && !r.published) notFound();
  const tableCount = Number(r.table_count ?? 0);
  const table =
    tableParam && /^[0-9]+$/.test(tableParam) && Number(tableParam) >= 1
      ? Math.min(Number(tableParam), Math.max(tableCount, 1))
      : null;
  const defaultTheme =
    c.defaultTheme === "dark" || c.defaultTheme === "light"
      ? c.defaultTheme
      : null;
  return (
    <>
      {defaultTheme && (
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('fincan-menu-theme')}catch(e){s=null}document.documentElement.dataset.menuTheme=s==='dark'||s==='light'?s:'${defaultTheme}'`,
          }}
        />
      )}
      <PublicMenu
        cafe={{
          ...c,
          slug,
          name: r.name,
          location: r.location,
          socialLinks: r.social as Record<string, string> | undefined,
          published: r.published,
          tableCount,
          logoUrl: r.logo_url ?? undefined,
          id: r.id,
          createdAt: new Date(r.created_at).toISOString(),
        } as never}
        table={table}
      />
    </>
  );
}