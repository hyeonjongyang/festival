"use client";

import { useEffect, useId, useState } from "react";
import type { SVGProps } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
  const previewColumns = 3;
  const hasPreviewOverflow = entries.length > previewColumns;
  const previewBoothCount = hasPreviewOverflow ? previewColumns - 1 : previewColumns;
  const previewEntries = entries.slice(0, Math.min(entries.length, previewBoothCount));
  const previewRemainder = hasPreviewOverflow ? Math.max(0, entries.length - previewEntries.length) : 0;
  const windowLabel = `${trending.windowMinutes}분`;
  const isHistory = trending.source === "history";
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
            "glass-card frosted relative overflow-hidden border border-[var(--outline)] px-3 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-shadow",
            expanded && "shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
            style={{ clipPath: "inset(0 round var(--radius-lg))" }}
          >
            <span className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(120%_140%_at_50%_0%,_rgba(255,120,120,0.22),_transparent_72%)]" />
            <span className="absolute -left-12 -top-14 h-36 w-36 rounded-full bg-[rgba(255,140,140,0.18)] blur-[80px]" />
            <span className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[rgba(255,140,140,0.18)] blur-[80px]" />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="relative z-10 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  실시간 인기 부스 🔥
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                {error ? "업데이트 실패" : null}
                <ChevronIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded ? "rotate-180" : "rotate-0",
                  )}
                />
              </div>
            </div>
          </button>

          {!expanded ? (
            <div className="relative z-10 mt-2.5">
              <div
                className={cn(
                  "gap-1.5 overflow-hidden text-xs",
                  entries.length > 0
                    ? "grid grid-flow-col grid-rows-1 items-center [grid-auto-columns:minmax(0,1fr)]"
                    : "flex",
                )}
              >
                {entries.length > 0 ? (
                  previewEntries.map((entry, idx) => (
                    <Link
                      key={entry.id}
                      href={`/booths/${encodeURIComponent(entry.id)}`}
                      className="hot-booth-pill group/pill relative overflow-hidden rounded-full border border-[var(--hot-pill-border)] bg-[linear-gradient(135deg,var(--hot-pill-from),var(--hot-pill-to))] px-3.5 py-2 backdrop-blur-sm transition-all duration-300 hover:border-[var(--hot-pill-border-hover)]"
                      style={{
                        animationDelay: `${idx * 50}ms`,
                        animation: "slideInFromTop 0.4s ease-out backwards",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          aria-label={rankAriaLabel(entry.rank)}
                          title={rankAriaLabel(entry.rank)}
                          className={cn(
                            "shrink-0 font-semibold text-[var(--text-muted)]",
                            entry.rank <= 3 ? "text-[14px]" : "text-[12px]",
                          )}
                        >
                          {rankPreviewLabel(entry.rank)}
                        </span>
                        <span
                          title={entry.boothName}
                          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-clip text-[13px] font-normal leading-tight text-[var(--text-primary)]"
                        >
                          <span
                            className="block w-full"
                            style={{
                              WebkitMaskImage:
                                "linear-gradient(to right, #000 0, #000 calc(100% - 14px), transparent 100%)",
                              maskImage:
                                "linear-gradient(to right, #000 0, #000 calc(100% - 14px), transparent 100%)",
                            }}
                          >
                            {entry.boothName}
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-full border border-[var(--hot-pill-border)] bg-[var(--hot-pill-empty)] px-4 py-2 text-[11px] text-[var(--text-muted)] backdrop-blur-sm">
                    {emptyMessage}
                  </div>
                )}
                {entries.length > 0 && previewRemainder > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="hot-booth-pill group/pill relative overflow-hidden rounded-full border border-[var(--hot-pill-border)] bg-[linear-gradient(135deg,var(--hot-pill-from),var(--hot-pill-to))] px-3.5 py-2 backdrop-blur-sm transition-all duration-300 hover:border-[var(--hot-pill-border-hover)]"
                    style={{
                      animationDelay: `${previewEntries.length * 50}ms`,
                      animation: "slideInFromTop 0.4s ease-out backwards",
                    }}
                  >
                    <div className="flex min-w-0 items-center justify-center">
                      <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                        +{previewRemainder}
                      </span>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            id={panelId}
            className={cn(
              "relative z-10 grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0",
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
                    <li key={entry.id}>
                      <Link
                        href={`/booths/${encodeURIComponent(entry.id)}`}
                        className="block rounded-[22px] border border-[var(--outline)] bg-[var(--bg-secondary)] px-4 py-3 transition hover:border-[var(--outline-strong)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              aria-label={rankAriaLabel(entry.rank)}
                              title={rankAriaLabel(entry.rank)}
                              className="text-xs text-[var(--text-muted)]"
                            >
                              {rankLabel(entry.rank)}
                            </p>
                            <p
                              className="truncate text-lg font-normal text-[var(--text-primary)]"
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
                          <div className="shrink-0 text-right">
                            <p className="text-2xl font-semibold text-[var(--accent)]">
                              {entry.recentVisitCount}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                              {isHistory ? "누적 방문" : "최근 방문"}
                            </p>
                          </div>
                        </div>
                      </Link>
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

function rankLabel(rank: number) {
  return `#${rank}`;
}

function rankPreviewLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rankLabel(rank);
}

function rankAriaLabel(rank: number) {
  return `랭크 ${rank}`;
}
