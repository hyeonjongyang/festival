"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import { BOOTH_RECENT_LOG_LIMIT } from "@/lib/config/constants";
import type { BoothPointsDashboard } from "@/lib/points/dashboard";
import type { BoothPointLogItem } from "@/lib/points/logs";

const logFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

const DASHBOARD_REFRESH_DELAY_MS = 1200;

type Banner =
  | {
      variant: "success" | "error";
      message: string;
    }
  | null;

class ApiError extends Error {
  status: number;
  payload: Record<string, unknown> | null;

  constructor(
    message: string,
    status: number,
    payload: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function BoothPointsClient({
  initialData,
}: {
  initialData: BoothPointsDashboard;
}) {
  const [logs, setLogs] = useState<BoothPointLogItem[]>(
    initialData.recentLogs,
  );
  const [stats, setStats] = useState(initialData.stats);
  const [search, setSearch] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [banner, setBanner] = useState<Banner>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  const lastScannerValueRef = useRef<string | null>(null);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dashboardRequestRef = useRef<AbortController | null>(null);

  const filteredLogs = useMemo(() => filterLogs(logs, search), [logs, search]);

  const syncDashboard = useCallback(async () => {
    dashboardRequestRef.current?.abort();
    const controller = new AbortController();
    dashboardRequestRef.current = controller;

    try {
      const payload = (await requestJson(
        "/api/points/dashboard",
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
        "지급 현황을 불러오지 못했습니다.",
      )) as { dashboard?: BoothPointsDashboard };

      if (!payload.dashboard) {
        throw new Error("응답 형식이 올바르지 않습니다.");
      }

      setLogs(payload.dashboard.recentLogs);
      setStats(payload.dashboard.stats);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("부스 대시보드를 동기화하지 못했습니다.", error);
    } finally {
      if (dashboardRequestRef.current === controller) {
        dashboardRequestRef.current = null;
      }
    }
  }, [setLogs, setStats]);

  const queueDashboardRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
    }

    autoRefreshTimerRef.current = setTimeout(() => {
      autoRefreshTimerRef.current = null;
      void syncDashboard();
    }, DASHBOARD_REFRESH_DELAY_MS);
  }, [syncDashboard]);

  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current);
      }
      dashboardRequestRef.current?.abort();
    };
  }, []);

  const handleAward = useCallback(
    async (qrToken: string, source: "scanner" | "manual") => {
      const trimmed = qrToken.trim();

      if (!trimmed || isAwarding) {
        return;
      }

      setIsAwarding(true);
      setBanner(null);

      try {
        const payload = (await requestJson(
          "/api/points/award",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ qrToken: trimmed }),
          },
          "포인트 지급 요청에 실패했습니다.",
        )) as { log?: BoothPointLogItem };

        const log = payload.log;

        if (!log) {
          throw new Error("응답 형식이 올바르지 않습니다.");
        }

        setLogs((prev) => {
          const next = [
            log,
            ...prev.filter((item) => item.id !== log.id),
          ];
          return next.slice(0, BOOTH_RECENT_LOG_LIMIT);
        });

        setStats((prev) => ({
          totalAwards: prev.totalAwards + 1,
          totalPoints: prev.totalPoints + log.points,
        }));

        setBanner({
          variant: "success",
          message: `${log.studentNickname}님에게 ${log.points}점을 지급했어요.`,
        });

        setManualToken("");
        setSearch("");
        queueDashboardRefresh();
      } catch (error) {
        if (error instanceof ApiError) {
          setBanner({
            variant: "error",
            message: formatErrorMessage(
              error.message,
              parseAvailableAt(error.payload),
            ),
          });
        } else {
          setBanner({
            variant: "error",
            message:
              error instanceof Error
                ? error.message
                : "포인트를 지급하지 못했습니다.",
          });
        }
      } finally {
        setIsAwarding(false);

        if (source === "scanner") {
          setTimeout(() => {
            if (lastScannerValueRef.current === trimmed) {
              lastScannerValueRef.current = null;
            }
          }, 1500);
        }
      }
    },
    [isAwarding, queueDashboardRefresh],
  );

  const handleScannerDetected = useCallback(
    (value: string) => {
      if (!value || isAwarding) {
        return;
      }

      if (lastScannerValueRef.current === value) {
        return;
      }

      lastScannerValueRef.current = value;
      void handleAward(value, "scanner");
    },
    [handleAward, isAwarding],
  );

  const handleManualSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleAward(manualToken, "manual");
    },
    [manualToken, handleAward],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-9">
      <ManagementCard as="header" className="space-y-5">
        <div className="space-y-3">
          <ManagementEyebrow className="text-primary">BOOTH</ManagementEyebrow>
          <h1 className="text-3xl font-semibold text-foreground">
            {initialData.booth.name} 포인트 스테이션
          </h1>
          <p className="text-sm text-soft">
            QR 코드를 스캔해 학생에게 포인트를 지급하고, 최근 지급 내역을 한눈에 확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-soft sm:grid-cols-4">
          <StatsCard label="부스장" value={initialData.booth.ownerNickname} />
          <StatsCard label="위치" value={initialData.booth.location ?? "미정"} />
          <StatsCard
            label="누적 지급"
            value={`${stats.totalPoints.toLocaleString()}점`}
            highlight
          />
          <StatsCard label="지급 횟수" value={`${stats.totalAwards}회`} />
        </div>
      </ManagementCard>

      <ManagementCard className="space-y-5">
        <QrScanner onDetected={handleScannerDetected} disabled={isAwarding} />

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label className="text-sm text-soft">
            QR 토큰을 직접 입력하고 싶다면 아래 칸에 붙여넣으세요.
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="예: 8c3f1a12-..."
              className="flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3 text-base text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={manualToken.trim().length === 0 || isAwarding}
              className="rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {isAwarding ? "지급 중..." : "직접 지급"}
            </button>
          </div>
        </form>

        {banner ? <BannerMessage banner={banner} /> : null}
      </ManagementCard>

      <ManagementCard className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <ManagementEyebrow>HISTORY</ManagementEyebrow>
            <h2 className="mt-2 text-xl font-semibold text-foreground">최근 지급 내역</h2>
            <p className="text-sm text-muted">
              학번/닉네임으로 검색하면 필요한 기록만 빠르게 찾을 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="닉네임, 학번 검색"
              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-60"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-primary transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                초기화
              </button>
            ) : null}
          </div>
        </header>

        <HistoryList logs={filteredLogs} totalLogs={logs.length} search={search} />
      </ManagementCard>
    </div>
  );
}

type StatsCardProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function StatsCard({ label, value, highlight }: StatsCardProps) {
  return (
    <ManagementCard
      as="div"
      padding="sm"
      className={`space-y-2 ${highlight ? "border-primary bg-primary/10" : "bg-background/70"}`}
    >
      <ManagementEyebrow className="tracking-[0.24em] text-muted">
        {label}
      </ManagementEyebrow>
      <p
        className={`text-2xl font-semibold ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </ManagementCard>
  );
}

function BannerMessage({ banner }: { banner: NonNullable<Banner> }) {
  const styles =
    banner.variant === "success"
      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
      : "border-rose-300/40 bg-rose-500/10 text-rose-100";

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles}`}>
      {banner.message}
    </p>
  );
}

function HistoryList({
  logs,
  totalLogs,
  search,
}: {
  logs: BoothPointLogItem[];
  totalLogs: number;
  search: string;
}) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-soft">
        {search
          ? "검색과 일치하는 지급 기록이 없습니다."
          : "아직 지급한 포인트가 없습니다. QR을 스캔해 첫 기록을 남겨보세요."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        총 {totalLogs}건 중 {logs.length}건 표시
      </p>
      <ul className="space-y-3">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3"
          >
            <div>
              <p className="text-base font-semibold text-foreground">
                {log.studentNickname}
              </p>
              <p className="text-xs text-muted">{log.studentLabel}</p>
              <p className="text-xs text-muted">
                {logFormatter.format(new Date(log.awardedAt))}
              </p>
            </div>
            <span className="text-lg font-semibold text-primary">
              +{log.points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ScannerStatus = "initializing" | "ready" | "error";

type QrScannerProps = {
  onDetected: (value: string) => void;
  disabled?: boolean;
};

function QrScanner({ onDetected, disabled }: QrScannerProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoElement(node);
  }, []);

  useEffect(() => {
    if (!videoElement) {
      return;
    }

    if (disabled) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    const supportError = getCameraSupportError();

    if (supportError) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setStatus("error");
      setErrorMessage(supportError);
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let active = true;
    setStatus("initializing");
    setErrorMessage(null);

    reader
      .decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, error) => {
          if (!active) {
            return;
          }

          if (result) {
            const text = result.getText();
            if (text) {
              onDetected(text);
            }
          }

          if (error && error.name === "NotFoundException") {
            // ignore frame without QR
            return;
          }
        },
      )
      .then((controls) => {
        if (!active) {
          controls.stop();
          return;
        }

        controlsRef.current?.stop();
        controlsRef.current = controls;
        setStatus("ready");
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        controlsRef.current?.stop();
        controlsRef.current = null;
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "카메라를 사용할 수 없습니다.",
        );
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [videoElement, disabled, onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-background/70">
        <video
          ref={videoRef}
          className="h-64 w-full object-cover"
          muted
          autoPlay
          playsInline
        />
        <ScannerOverlay status={status} disabled={Boolean(disabled)} />
      </div>
      {status === "error" ? (
        <p className="text-sm text-rose-200">
          {errorMessage ?? "카메라 접근 권한을 허용해주세요."}
        </p>
      ) : (
        <p className="text-sm text-muted">
          {disabled
            ? "현재 포인트 지급을 처리 중입니다..."
            : "카메라를 학생 QR 코드에 맞추면 자동으로 인식됩니다."}
        </p>
      )}
    </div>
  );
}

type ScannerOverlayProps = {
  status: ScannerStatus;
  disabled: boolean;
};

function ScannerOverlay({ status, disabled }: ScannerOverlayProps) {
  let label = "카메라 준비 중";
  let badgeClass = "bg-background/80 text-soft";

  if (status === "ready") {
    label = disabled ? "지급 처리 중" : "스캔 준비 완료";
    badgeClass = disabled
      ? "bg-[color:var(--theme-primary-strong)] text-foreground"
      : "bg-primary text-foreground";
  } else if (status === "error") {
    label = "카메라 오류";
    badgeClass = "bg-rose-600/80 text-white";
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background/80 via-background/30 to-transparent">
      <span className={`mb-6 rounded-full px-4 py-1 text-xs font-semibold ${badgeClass}`}>
        {label}
      </span>
    </div>
  );
}

function filterLogs(logs: BoothPointLogItem[], query: string) {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return logs;
  }

  return logs.filter((log) => {
    const nickname = log.studentNickname.toLowerCase();
    const label = log.studentLabel.toLowerCase();
    return nickname.includes(trimmed) || label.includes(trimmed);
  });
}

function parseAvailableAt(payload: Record<string, unknown> | null) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = (payload as { availableAt?: unknown }).availableAt;

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatErrorMessage(message: string, availableAt: Date | null) {
  if (!availableAt) {
    return message;
  }

  return `${message} · ${timeFormatter.format(availableAt)} 이후 다시 시도`;
}

function getCameraSupportError(): string | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "브라우저 환경에서만 카메라를 사용할 수 있습니다.";
  }

  if (!window.isSecureContext) {
    return "보안 연결(https)에서 접속해야 카메라를 사용할 수 있습니다.";
  }

  const mediaDevices = navigator.mediaDevices;

  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
    return "이 브라우저에서는 카메라 접근을 지원하지 않습니다. 최신 브라우저에서 다시 시도해주세요.";
  }

  return null;
}

async function requestJson(
  input: RequestInfo,
  init: RequestInit,
  fallbackMessage: string,
) {
  const response = await fetch(input, init);
  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message || fallbackMessage
        : fallbackMessage;

    throw new ApiError(message, response.status, payload);
  }

  return payload ?? {};
}
