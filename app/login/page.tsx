import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthForm from "./auth-form";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await currentUser()) redirect("/");
  return <AuthForm />;
}
