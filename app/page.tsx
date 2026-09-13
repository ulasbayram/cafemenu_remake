import Dashboard from "./dashboard";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { view } = await searchParams;
  const initialTab = [
    "overview",
    "cafes",
    "menus",
    "scan",
    "stats",
    "settings",
  ].includes(view || "")
    ? (view as "overview" | "cafes" | "menus" | "scan" | "stats" | "settings")
    : "overview";
  return (
    <Dashboard
      initialDate={new Date().toISOString()}
      signedIn={!!user}
      userName={user.name}
      initialTab={initialTab}
    />
  );
}
