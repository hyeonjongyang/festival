import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { LoginForm } from "@/components/auth/login-form";

export default async function Home() {
  const session = await getSessionUser();

  if (session) {
    redirect("/feed");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-sm space-y-6">
          <section
            className="space-y-6 rounded-2xl border border-border bg-surface p-6"
            style={{ boxShadow: "var(--theme-shadow-soft)" }}
            aria-labelledby="login-heading"
          >
            <h1
              id="login-heading"
              className="text-xl font-semibold text-foreground"
            >
              로그인
            </h1>
            <LoginForm />
          </section>
        </div>
      </main>
    </div>
  );
}
