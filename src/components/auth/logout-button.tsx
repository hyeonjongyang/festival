"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context";
import { cn } from "@/lib/client/cn";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  tone?: "light" | "dark";
  intent?: "accent" | "danger";
  helperText?: string | null;
};

export function LogoutButton({
  className,
  label = "로그아웃",
  tone = "light",
  intent = "accent",
  helperText = "현재 세션을 종료하고 다시 시작 화면으로 이동합니다.",
}: LogoutButtonProps) {
  const { setSession } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/code-login", { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message ?? "세션을 종료하지 못했습니다.");
      }
      setSession(null);
      router.push("/");
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "세션을 종료하지 못했습니다.";
      setMessage(fallback);
    } finally {
      setPending(false);
    }
  };

  const helperClass = tone === "dark" ? "text-white/70" : "text-[var(--text-muted)]";
  const errorClass = tone === "dark" ? "text-[#ffc2bf]" : "text-[var(--danger)]";
  const palette =
    intent === "danger"
      ? {
          border: "border-[#ff7b72]",
          background: "bg-[#f63b3b]",
          hover: "hover:bg-[#d92f2f]",
          shadow: "shadow-[0_18px_35px_rgba(246,59,59,0.35)]",
          ring: "focus-visible:ring-[#ffaba6]",
        }
      : {
          border: "border-[var(--accent-strong)]",
          background: "bg-[var(--accent)]",
          hover: "hover:bg-[var(--accent-strong)]",
          shadow: "shadow-[0_20px_45px_rgba(0,0,0,0.35)]",
          ring: "focus-visible:ring-[var(--accent)]",
        };

  return (
    <div className={cn("flex flex-col gap-2 text-left", className)}>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className={cn(
          "group relative overflow-hidden rounded-2xl border px-6 py-4 text-sm font-semibold uppercase tracking-[0.4em] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-65",
          tone === "dark" ? "focus-visible:ring-offset-transparent" : "focus-visible:ring-offset-2",
          palette.ring,
          palette.border,
          palette.background,
          palette.hover,
          palette.shadow,
          "hover:-translate-y-0.5 active:translate-y-0",
        )}
      >
        <span className="relative z-10">{pending ? "종료중…" : label}</span>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/25 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </button>
      {message ? (
        <p className={cn("text-xs", errorClass)} role="alert" aria-live="assertive">
          {message}
        </p>
      ) : helperText ? (
        <p className={cn("text-xs leading-relaxed", helperClass)}>{helperText}</p>
      ) : null}
    </div>
  );
}
