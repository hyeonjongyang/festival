import { redirect } from "next/navigation";
import { AppShellFrame } from "@/components/app-shell/app-shell-frame";
import { getSessionUser } from "@/lib/auth/get-session-user";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/");
  }

  return <AppShellFrame>{children}</AppShellFrame>;
}
