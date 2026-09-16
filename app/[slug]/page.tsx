import { permanentRedirect } from "next/navigation";

/**
 * Legacy root-level menu URLs (printed QRs pre-dating /menu/{slug}) keep
 * working: permanent redirect to the same path under /menu, preserving
 * ?table&order params. Browsers follow it, so printed cards never need
 * reprinting.
 */
export const dynamic = "force-dynamic";
export default async function LegacyMenuRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const qs = query.toString();
  permanentRedirect(`/menu/${slug}${qs ? `?${qs}` : ""}`);
}