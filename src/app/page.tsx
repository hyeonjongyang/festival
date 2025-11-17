import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getSessionUser();

  if (session) {
    redirect("/feed");
  }

  return <LoginForm />;
}
