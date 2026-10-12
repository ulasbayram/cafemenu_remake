import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PackageADashboard from "@/enterprise/extensions/package-a/dashboard";
import { previewData } from "@/enterprise/extensions/package-a/preview-data";
import { serverSupabase } from "@/lib/supabase-server";
import { enterpriseAssignment } from "@/enterprise/server";
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
  if (!demo) {
    const {
      data: { session },
    } = await (await serverSupabase()).auth.getSession();
    if (!session?.user)
      redirect(`/login?next=${encodeURIComponent("/enterprise/package-a")}`);
    const assignment = await enterpriseAssignment(
      "package-a",
      session.user.id,
      session.access_token,
      query.cafe,
    );
    if (!assignment) redirect("/");
  }
  return (
    <PackageADashboard
      key={demo ? scenario : (query.cafe ?? "default")}
      preview={demo}
      initialData={demo ? previewData(scenario) : null}
      requestedCafe={query.cafe}
    />
  );
}
