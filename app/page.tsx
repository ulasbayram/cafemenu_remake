import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase-server";
import { visibleEnterpriseExtensions } from "@/enterprise/server";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialTab = [
    "overview",
    "cafes",
    "menus",
    "products",
    "orders",
    "import",
    "stats",
    "settings",
  ].includes(view || "")
    ? (view as
        | "overview"
        | "cafes"
        | "menus"
        | "products"
        | "orders"
        | "import"
        | "stats"
        | "settings")
    : "overview";
  // Bare "/" routes enterprise users to their package workspace; the regular
  // dashboard stays reachable via an explicit ?view= link.
  if (!view) {
    const {
      data: { session },
    } = await (await serverSupabase()).auth.getSession();
    if (session) {
      const packages = await visibleEnterpriseExtensions(
        session.user.id,
        session.access_token,
      );
      if (packages.length) redirect(packages[0].href);
    }
  }
  return <Dashboard initialTab={initialTab} />;
}
