import Dashboard from "./dashboard";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // Client-side guard: the dashboard checks the Supabase session and
  // redirects to /login itself (auth state lives in the browser).
  const { view } = await searchParams;
  const initialTab = [
    "overview",
    "cafes",
    "menus",
    "import",
    "stats",
    "settings",
  ].includes(view || "")
    ? (view as "overview" | "cafes" | "menus" | "import" | "stats" | "settings")
    : "overview";
  return <Dashboard initialTab={initialTab} />;
}