"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type LoginError = string | null;

export function useLoginMutation() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<LoginError>(null);

  const login = useCallback(
    async (code: string) => {
      setIsPending(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/code-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            typeof data?.message === "string"
              ? data.message
              : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
          throw new Error(message);
        }

        router.replace("/feed");
        router.refresh();
      } catch (loginError) {
        setError(
          loginError instanceof Error
            ? loginError.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setIsPending(false);
      }
    },
    [router],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { login, error, isPending, reset };
}
