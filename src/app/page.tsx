import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(normalizeParam(resolvedSearchParams.next));
  const session = await getSessionUser();

  if (session) {
    redirect(nextPath ?? "/feed");
  }

  return <LoginForm />;
}

function normalizeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return (value[0] ?? "").trim() || null;
  return null;
}

function getSafeNextPath(nextValue: string | null) {
  if (!nextValue) return null;
  if (!nextValue.startsWith("/")) return null;
  if (nextValue.startsWith("//")) return null;
  return nextValue;
}
