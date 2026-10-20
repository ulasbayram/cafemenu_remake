import { svc } from "@/db";
import PublicMenu from "../../public-menu";
import { notFound } from "next/navigation";
import { verifyTableOrder } from "@/lib/table-order-token";
import { cookies } from "next/headers";
import { publicCafeData, wifiCookieName } from "@/lib/menu-wifi";
import type { Cafe } from "@/lib/menu";
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
  const raw = (r.data ?? {}) as Record<string, unknown> & {
    wifi?: Cafe["wifi"];
  };
  let ordered = false;
  if (raw.wifi?.password && raw.wifi.visibility === "after-order") {
    const proof = (await cookies()).get(wifiCookieName(r.id))?.value;
    if (proof && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(proof)) {
      const { data: receipt } = await svc()
        .from("orders")
        .select("id")
        .eq("id", proof)
        .eq("cafe", r.id)
        // eslint-disable-next-line react-hooks/purity -- Dynamic server request: expire the receipt at request time.
        .gte("created_at", new Date(Date.now() - 43200000).toISOString())
        .maybeSingle();
      ordered = !!receipt;
    }
  }
  const c = publicCafeData(raw, ordered);
  if (!r.published) notFound();
  const tableCount = Number(r.table_count ?? 0);
  const policy = {
    enabled: true,
    mode: "token" as const,
    ...((c.orderPolicy as {
      enabled?: boolean;
      mode?: "token" | "token+daily" | "open";
    }) ?? {}),
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
        orderToken={
          canOrder
            ? (orderToken ?? (policy.mode === "open" ? "open" : null))
            : null
        }
        orderMode={canOrder ? policy.mode : null}
      />
    </>
  );
}
