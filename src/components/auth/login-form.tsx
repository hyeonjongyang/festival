"use client";

import { useState } from "react";
import { useLoginMutation } from "@/lib/auth/use-login-mutation";

const CODE_LENGTH = 5;
const CODE_PATTERN = /^[A-Z0-9]{5}$/;

export function LoginForm() {
  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const { login, error, isPending, reset } = useLoginMutation();

  const handleChange = (value: string) => {
    const sanitized = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);
    setCode(sanitized);

    if (inputError) {
      setInputError(null);
    }

    if (error) {
      reset();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!CODE_PATTERN.test(code)) {
      setInputError("5자리 영문 대문자/숫자 코드를 입력해주세요.");
      return;
    }

    await login(code);
  };

  const displayError = inputError ?? error;

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="login-code"
          className="text-sm font-medium text-soft"
        >
          로그인 코드
        </label>
        <input
          id="login-code"
          name="code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoFocus
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(event) => handleChange(event.target.value)}
          aria-invalid={displayError ? "true" : "false"}
          aria-describedby={displayError ? "login-code-error" : undefined}
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-lg font-medium tracking-[0.4em] text-center text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          placeholder="A1B2C"
          disabled={isPending}
        />
      </div>

      {displayError ? (
        <p
          id="login-code-error"
          role="alert"
          aria-live="assertive"
          className="text-sm font-medium text-primary"
        >
          {displayError}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? "로그인 중..." : "입장하기"}
      </button>
    </form>
  );
}
