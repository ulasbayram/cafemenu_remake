import type { Metadata } from "next";
import PackageADashboard from "@/enterprise/extensions/package-a/dashboard";
import { previewData } from "@/enterprise/extensions/package-a/preview-data";
export const metadata: Metadata = {
  title: "Paket A Enterprise Dashboard · Fincan",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function EnterprisePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; scenario?: string; cafe?: string }>;
}) {
  const query = await searchParams;
  const demo = process.env.NODE_ENV === "development" && query.preview === "1";
  const scenario = query.scenario === "nova" ? "nova" : "ortak";
  return (
    <PackageADashboard
      key={demo ? scenario : (query.cafe ?? "default")}
      preview={demo}
      initialData={demo ? previewData(scenario) : null}
      requestedCafe={query.cafe}
    />
  );
}
