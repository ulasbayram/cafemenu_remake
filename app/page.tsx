import Dashboard from "./dashboard";
import { getChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getChatGPTUser();
  return (
    <Dashboard
      initialDate={new Date().toISOString()}
      signedIn={!!user}
      userName={user?.fullName || "Kafe sahibi"}
    />
  );
}
