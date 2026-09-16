import { svc } from "@/db";
import PublicMenu from "../../public-menu";
import { notFound } from "next/navigation";
import { verifyTableOrder } from "@/lib/table-order-token";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; order?: string }>;
}) {
  const { slug } = await params;
  const { table: tableParam, order: orderToken } = await searchParams;
  const { data } = await svc()
    .from("cafes")
    .select(
      "id, name, location, social, published, table_count, logo_url, data, created_at",
    )
    .eq("slug", slug)
    .limit(1);
  const r = data?.[0];
  if (!r) notFound();
  const c = (r.data ?? {}) as Record<string, unknown>;
  if (!r.published) notFound();
  const tableCount = Number(r.table_count ?? 0);
  const policy = {
    enabled: true,
    mode: "token" as const,
    ...((c.orderPolicy as { enabled?: boolean; mode?: "token" | "token+daily" | "open" }) ?? {}),
  };
  const table =
    tableParam && /^[0-9]+$/.test(tableParam) && Number(tableParam) >= 1
      ? Math.min(Number(tableParam), Math.max(tableCount, 1))
      : null;
  // token modes require a scanned QR (table + valid HMAC token). Open mode
  // only needs ordering on and tables defined — the guest picks the table.
  const canOrder =
    !!policy.enabled &&
    tableCount > 0 &&
    (policy.mode === "open" ||
      !!(
        table &&
        orderToken &&
        (await verifyTableOrder(r.id, table, orderToken))
      ));
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
        cafe={
          {
            ...c,
            slug,
            name: r.name,
            location: r.location,
            socialLinks: r.social as Record<string, string> | undefined,
            published: r.published,
            tableCount,
            logoUrl:
              r.logo_url ?? (c.logoUrl as string | undefined) ?? undefined,
            id: r.id,
            createdAt: r.created_at,
          } as never
        }
        table={table}
        orderToken={canOrder ? (orderToken ?? (policy.mode === "open" ? "open" : null)) : null}
        orderMode={canOrder ? policy.mode : null}
      />
    </>
  );
}
