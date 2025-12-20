"use client";

import { useEffect, useId, useState } from "react";
import type { SVGProps } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { jsonFetch } from "@/lib/client/http";
import { cn } from "@/lib/client/cn";
import type { TrendingBoothResult } from "@/types/api";
import { StarGlyph } from "@/components/chrome/star-meter";

type TrendingResponse = {
  trending: TrendingBoothResult;
};

type RealtimeHotBoothsProps = {
  initial: TrendingBoothResult;
};

const REFRESH_INTERVAL_MS = 15000;

export function RealtimeHotBooths({ initial }: RealtimeHotBoothsProps) {
  const [expanded, setExpanded] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { data, error } = useSWR<TrendingResponse>(
    "/api/leaderboard/trending",
    (url: string) => jsonFetch<TrendingResponse>(url),
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      fallbackData: { trending: initial },
    },
  );

  const trending = data?.trending ?? initial;
  const entries = trending.entries;
  const windowLabel = `${trending.windowMinutes}분`;
  const isHistory = trending.source === "history";
  const basisLabel = isHistory ? "이전 기록" : `${windowLabel} 기준`;
  const emptyMessage = isHistory
    ? "방문 기록이 아직 없습니다."
    : `최근 ${windowLabel} 방문 기록이 없습니다.`;
  const portalTarget = portalReady ? document.body : null;

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed left-0 right-0 top-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md">
        <div
          className={cn(
            "glass-card frosted relative overflow-hidden border border-[var(--outline)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-shadow",
            expanded && "shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(120%_140%_at_50%_0%,_rgba(255,120,120,0.22),_transparent_72%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-12 -top-14 z-0 h-36 w-36 rounded-full bg-[rgba(255,140,140,0.18)] blur-[80px]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 z-0 h-36 w-36 rounded-full bg-[rgba(255,140,140,0.18)] blur-[80px]"
          />

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="relative z-10 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  실시간 인기 부스 🔥
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <span>{basisLabel}</span>
                {error ? "업데이트 실패" : null}
                <ChevronIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded ? "rotate-180" : "rotate-0",
                  )}
                />
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                expanded
                  ? "max-h-0 -translate-y-2 opacity-0 pointer-events-none mt-0"
                  : "max-h-24 translate-y-0 opacity-100 mt-2",
              )}
              aria-hidden={expanded}
            >
              <div className="flex gap-2 overflow-x-auto pb-1 pr-2 text-xs soft-scrollbar">
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <span
                      key={entry.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-1 text-[var(--text-primary)]"
                    >
                      <span className="text-[10px] text-[var(--text-muted)]">#{entry.rank}</span>
                      <span className="font-semibold">{entry.boothName}</span>
                      {entry.ratingAverage !== null && entry.ratingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-primary)]">
                          <span style={{ color: "var(--rating-star, #fadb4a)" }}>
                            <StarGlyph size={12} />
                          </span>
                          {entry.ratingAverage.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">평점 없음</span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
                    {emptyMessage}
                  </span>
                )}
              </div>
            </div>
          </button>

          <div
            id={panelId}
            className={cn(
              "relative z-10 grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded ? "grid-rows-[1fr] opacity-100 -mt-2" : "grid-rows-[0fr] opacity-0 mt-0",
            )}
          >
            <div className="overflow-hidden pt-0">
              {error ? (
                <p className="rounded-2xl border border-[var(--danger)]/40 px-3 py-2 text-xs text-[var(--danger)]">
                  실시간 인기 부스를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
                </p>
              ) : null}

              {!error && entries.length === 0 ? (
                <p className="rounded-2xl border border-[var(--outline)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  {emptyMessage}
                </p>
              ) : null}

              {!error && entries.length > 0 ? (
                <ul className="space-y-3">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-[22px] border border-[var(--outline)] bg-[var(--bg-secondary)]/90 px-4 py-3 transition hover:border-[var(--outline-strong)]"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">#{entry.rank}</p>
                          <p
                            className="text-lg font-semibold text-[var(--text-primary)]"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {entry.boothName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {entry.location ?? "위치 미정"}
                          </p>
                          {entry.ratingAverage !== null && entry.ratingCount > 0 ? (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                                <span style={{ color: "var(--rating-star, #fadb4a)" }}>
                                  <StarGlyph size={14} />
                                </span>
                                {entry.ratingAverage.toFixed(1)}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                {entry.ratingScope === "recent"
                                  ? "최근 평점"
                                  : "전체 평점"}
                              </span>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-[var(--text-muted)]">평점 없음</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-[var(--accent)]">
                            {entry.recentVisitCount}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {isHistory ? "누적 방문" : "최근 방문"}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="sr-only">
                {isHistory ? "이전 방문 기록 기준" : `최근 ${windowLabel} 방문 기준`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function ChevronIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
