import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ErpDashboard from "@/modules/erp/dashboard";
import { erpPreview } from "@/modules/erp/preview";
import { serverSupabase } from "@/lib/supabase-server";
import { hasAccountModule } from "@/lib/module-access";
export const metadata: Metadata = {
  title: "Stok ve ERP · Fincan",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const query = await searchParams;
  const preview =
    process.env.NODE_ENV === "development" && query.preview === "1";
  if (!preview) {
    const {
      data: { session },
    } = await (await serverSupabase()).auth.getSession();
    if (!session?.user)
      redirect("/login?next=%2Fmodules%2Ferp");
    if (!(await hasAccountModule(session.user.id, "erp"))) redirect("/");
  }
  return (
    <ErpDashboard
      preview={preview}
      initialData={preview ? erpPreview() : null}
    />
  );
}
