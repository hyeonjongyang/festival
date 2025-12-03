"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context";

const CODE_REGEX = /^[A-Z0-9]{5}$/;

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useSession();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = code.toUpperCase();

    if (!CODE_REGEX.test(normalized)) {
      setInvalid(true);
      return;
    }

    setPending(true);
    setInvalid(false);

    try {
      const response = await fetch("/api/auth/code-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.message ?? "로그인에 실패했습니다.");
      }

      if (json.user) {
        setSession(json.user);
      }

      router.push("/feed");
    } catch (loginError) {
      console.error(loginError);
      setInvalid(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)] sm:text-3xl">
          종촌고등학교 부스 한마당
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="login-code"
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            aria-label="로그인 코드"
            aria-invalid={invalid || undefined}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5));
              setInvalid(false);
            }}
            maxLength={5}
            pattern="[A-Z0-9]{5}"
            className={`w-full rounded-2xl border bg-[var(--surface-muted)] px-4 py-3 text-center text-2xl font-semibold tracking-[0.3em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none ${
              invalid ? "border-[var(--danger)] focus:border-[var(--danger)]" : "border-[var(--outline)] focus:border-[var(--accent)]"
            }`}
            placeholder="ABCDE"
          />

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {pending ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
