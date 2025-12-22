"use client";

import useSWR from "swr";
import Link from "next/link";
import { jsonFetch } from "@/lib/client/http";
import { formatCompactDate } from "@/lib/client/time";
import type { BoothLeaderboardResult } from "@/types/api";
import { StarGlyph } from "@/components/chrome/star-meter";

type LeaderboardResponse = {
  leaderboard: BoothLeaderboardResult;
};

type LeaderboardPanelProps = {
  initial: BoothLeaderboardResult;
  highlightBoothId?: string | null;
};

const REFRESH_INTERVAL_MS = 15000;

export function LeaderboardPanel({ initial, highlightBoothId }: LeaderboardPanelProps) {
  const { data, error } = useSWR<LeaderboardResponse>(
    "/api/leaderboard/booths",
    (url: string) => jsonFetch<LeaderboardResponse>(url),
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      fallbackData: { leaderboard: initial },
    },
  );

  const leaderboard = data?.leaderboard ?? initial;

  return (
    <section className="p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="chip inline-flex">부스 리더보드</p>
          <h2 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            방문 수 순위
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {formatCompactDate(leaderboard.generatedAt)} 기준 · {leaderboard.totalBooths}개 부스 집계
          </p>
        </div>
      </header>

      {error ? (
        <p className="mt-4 rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
          순위를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
        </p>
      ) : null}

      {leaderboard.entries.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
          아직 방문 기록이 없습니다. QR을 스캔하면 바로 순위가 표시됩니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {leaderboard.entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/booths/${encodeURIComponent(entry.id)}`}
                className={`group block rounded-[24px] border px-4 py-3 transition hover:border-[var(--outline-strong)] ${entry.id === highlightBoothId ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--outline)] bg-[var(--surface-muted)]"}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">#{entry.rank}</p>
                    <p className="truncate text-lg font-semibold text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                      {entry.boothName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{entry.location ?? "위치 미정"}</p>
                    {entry.ratingCount > 0 && entry.averageRating !== null ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                        <span style={{ color: "var(--rating-star, #fadb4a)" }}>
                          <StarGlyph size={16} />
                        </span>
                        {entry.averageRating.toFixed(1)}
                      </span>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">평점 없음</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-semibold text-[var(--accent)]">{entry.totalVisits}</p>
                    <p className="text-xs text-[var(--text-muted)]">누적 방문</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
