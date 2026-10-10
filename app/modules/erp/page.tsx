import type { Metadata } from "next";
import ErpDashboard from "@/modules/erp/dashboard";
import { erpPreview } from "@/modules/erp/preview";
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
  return (
    <ErpDashboard
      preview={preview}
      initialData={preview ? erpPreview() : null}
    />
  );
}
