"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  LeaderboardGradeFilter,
  LeaderboardResult,
} from "@/lib/leaderboard";

const gradeOptions: ReadonlyArray<{
  value: LeaderboardGradeFilter;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: 1, label: "1학년" },
  { value: 2, label: "2학년" },
];

const updatedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function LeaderboardClient({
  initialData,
  viewerId,
}: {
  initialData: LeaderboardResult;
  viewerId: string | null;
}) {
  const initialGrade = initialData.grade;
  const [selectedGrade, setSelectedGrade] = useState<LeaderboardGradeFilter>(
    initialGrade,
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  const shouldUseFallback = selectedGrade === initialGrade;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<LeaderboardResult, Error, [string, LeaderboardGradeFilter]>(
    ["leaderboard", selectedGrade],
    async ([, grade]) => requestLeaderboard(grade),
    {
      fallbackData: shouldUseFallback ? initialData : undefined,
      revalidateOnFocus: false,
      refreshInterval: 15000,
      keepPreviousData: true,
    },
  );

  const entries = data?.entries ?? [];
  const updatedAtText = data?.generatedAt
    ? updatedAtFormatter.format(new Date(data.generatedAt))
    : null;

  const handleGradeChange = useCallback(
    (grade: LeaderboardGradeFilter) => {
      setSelectedGrade(grade);

      const params = new URLSearchParams(searchParams.toString());
      if (grade === "all") {
        params.delete("grade");
      } else {
        params.set("grade", String(grade));
      }

      const queryString = params.toString();
      router.replace(
        queryString ? `/leaderboard?${queryString}` : "/leaderboard",
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  const handleManualRefresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  const stateBanner = error
    ? {
        message:
          error instanceof Error
            ? error.message
            : "리더보드를 불러오지 못했습니다.",
      }
    : null;

  return (
    <div className="space-y-6" aria-busy={isValidating}>
      {stateBanner ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-100 shadow-[var(--theme-shadow-soft)]"
        >
          {stateBanner.message}
        </div>
      ) : null}

      <section
        className="sticky top-20 z-30 space-y-3 rounded-3xl border border-border bg-surface px-5 py-4 shadow-[var(--theme-shadow-soft)] supports-[backdrop-filter]:bg-surface/95 supports-[backdrop-filter]:backdrop-blur"
        aria-label="학년 선택"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 sm:flex-1">
            {gradeOptions.map((option) => {
              const isActive = selectedGrade === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleGradeChange(option.value)}
                  aria-pressed={isActive}
                  className={`flex-1 min-w-[96px] rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive
                      ? "border-transparent bg-primary text-foreground shadow-[0_0_0_1px_rgba(29,116,252,0.6)]"
                      : "border-border bg-surface-alt text-soft hover:border-primary/60 hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isValidating}
            aria-busy={isValidating}
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface-alt px-4 py-2 text-xs font-semibold text-soft transition hover:border-primary/70 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {isValidating ? "새로고침 중" : "새로고침"}
          </button>
        </div>

        {updatedAtText ? (
          <p className="text-xs text-muted" aria-live="polite">
            기준 {updatedAtText}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        {isLoading && !data ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-3xl border border-border bg-surface px-6 py-6 text-center text-sm text-soft shadow-[var(--theme-shadow-soft)]"
          >
            불러오는 중
          </div>
        ) : null}

        {entries.length === 0 && !isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center shadow-[var(--theme-shadow-soft)]"
          >
            <p className="text-sm text-soft">순위 없음</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {entries.map((entry) => {
            const isViewer = Boolean(viewerId && viewerId === entry.id);
            const isTopThree = entry.rank <= 3;
            return (
              <article
                key={entry.id}
                className={`flex items-center justify-between gap-4 rounded-3xl border px-5 py-4 transition-shadow ${
                  isViewer
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(29,116,252,0.35)]"
                    : "border-border bg-surface-alt shadow-[var(--theme-shadow-soft)]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-base font-semibold ${
                      isTopThree
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-surface text-soft"
                    }`}
                  >
                    #{entry.rank}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {entry.nickname}
                    </p>
                    <p className="text-xs text-muted">{entry.profileLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {entry.points.toLocaleString()}P
                  </p>
                  <p className="text-xs text-muted">
                    {entry.grade ? `${entry.grade}학년` : "-"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

async function requestLeaderboard(grade: LeaderboardGradeFilter) {
  const params = new URLSearchParams();
  params.set("grade", grade === "all" ? "all" : String(grade));

  const response = await fetch(`/api/leaderboard?${params.toString()}`, {
    cache: "no-store",
  });

  let payload: Record<string, unknown> | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "리더보드를 불러오지 못했습니다.",
    );
  }

  if (!payload?.leaderboard) {
    throw new Error("응답 형식을 확인해주세요.");
  }

  return payload.leaderboard as LeaderboardResult;
}
