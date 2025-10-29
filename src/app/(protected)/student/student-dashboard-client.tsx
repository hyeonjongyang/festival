"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import QRCode from "react-qr-code";
import type { StudentDashboardData } from "@/lib/students/dashboard";

const logFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Banner =
  | {
      variant: "success" | "error";
      message: string;
    }
  | null;

export function StudentDashboardClient({
  initialData,
}: {
  initialData: StudentDashboardData;
}) {
  const [data, setData] = useState(initialData);
  const [nicknameValue, setNicknameValue] = useState(initialData.nickname);
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isQrPending, startQrTransition] = useTransition();
  const [isNicknamePending, startNicknameTransition] = useTransition();

  const profileLabel = useMemo(() => describeProfile(data), [data]);

  const refreshDashboard = useCallback(async () => {
    setIsRefreshingProfile(true);
    setBanner(null);

    try {
      const payload = (await requestJson(
        "/api/students/me",
        {
          method: "GET",
          cache: "no-store",
        },
        "정보 새로고침 실패",
      )) as { student?: StudentDashboardData };

      if (!payload.student) {
        throw new Error("응답 형식이 올바르지 않습니다.");
      }

      const nextData = payload.student;
      setData(nextData);
      setNicknameValue(nextData.nickname);
      setSuggestions([]);
      setNicknameMessage(null);
      setNicknameError(null);
      setBanner({
        variant: "success",
        message: "업데이트 완료",
      });
    } catch {
      setBanner({
        variant: "error",
        message: "새로고침 실패",
      });
    } finally {
      setIsRefreshingProfile(false);
    }
  }, []);

  const handleNicknameSubmit = useCallback(
    (lock?: boolean) => {
      if (data.nicknameLocked) {
        return;
      }

      setNicknameMessage(null);
      setNicknameError(null);

      startNicknameTransition(async () => {
        try {
          const result = (await requestJson(
            "/api/students/nickname",
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                nickname: nicknameValue,
                lock,
              }),
            },
            "닉네임 저장 실패",
          )) as { nickname?: string; nicknameLocked?: boolean };

          if (typeof result.nickname !== "string") {
            throw new Error("응답 형식이 올바르지 않습니다.");
          }

          setData((prev) => ({
            ...prev,
            nickname: String(result.nickname),
            nicknameLocked: Boolean(result.nicknameLocked),
          }));

          setNicknameMessage(lock ? "확정 완료" : "저장 완료");
          setSuggestions([]);
        } catch {
          setNicknameError("저장 실패");
        }
      });
    },
    [data.nicknameLocked, nicknameValue, startNicknameTransition],
  );

  const handleSuggestion = useCallback(async () => {
    if (data.nicknameLocked) {
      return;
    }

    setSuggestionLoading(true);
    setNicknameError(null);
    setNicknameMessage(null);

    try {
      const payload = (await requestJson(
        "/api/students/nickname?count=3",
        { method: "GET", cache: "no-store" },
        "추천 실패",
      )) as { suggestions?: unknown };

      const nextSuggestions = Array.isArray(payload.suggestions)
        ? payload.suggestions.filter(
            (suggestion): suggestion is string => typeof suggestion === "string",
          )
        : [];

      if (nextSuggestions.length > 0) {
        setNicknameValue(nextSuggestions[0]);
      }

      setSuggestions(nextSuggestions);
    } catch {
      setNicknameError("추천 실패");
    } finally {
      setSuggestionLoading(false);
    }
  }, [data.nicknameLocked]);

  const handleQrRefresh = useCallback(() => {
    setBanner(null);

    startQrTransition(async () => {
      try {
        const payload = (await requestJson(
          "/api/students/qr",
          { method: "POST" },
          "QR 갱신 실패",
        )) as { qrToken?: string };

        if (typeof payload.qrToken !== "string") {
          throw new Error("응답 형식이 올바르지 않습니다.");
        }

        setData((prev) => ({
          ...prev,
          qrToken: String(payload.qrToken),
        }));

        setBanner({
          variant: "success",
          message: "갱신 완료",
        });
      } catch {
        setBanner({
          variant: "error",
          message: "갱신 실패",
        });
      }
    });
  }, [startQrTransition]);

  return (
    <div className="space-y-5">
      {banner ? (
        <div
          role={banner.variant === "error" ? "alert" : "status"}
          aria-live={banner.variant === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            banner.variant === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <section className="glass-panel space-y-4 p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-white">
              {data.points.toLocaleString()}점
            </h2>
            {profileLabel ? (
              <p className="text-sm text-slate-300">{profileLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={isRefreshingProfile}
            aria-busy={isRefreshingProfile}
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
          >
            {isRefreshingProfile ? "로딩" : "새로고침"}
          </button>
        </header>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-medium text-slate-200">최근 적립</p>
          <RecentLogs logs={data.recentLogs} />
        </div>
      </section>

      <section className="glass-panel grid gap-6 p-6 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-white">QR 토큰</h2>
          <button
            type="button"
            onClick={handleQrRefresh}
            disabled={isQrPending}
            aria-busy={isQrPending}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {isQrPending ? "새로고침 중" : "QR 새로고침"}
          </button>
          <p
            className="font-mono text-xs text-slate-400 break-all"
            aria-live="polite"
          >
            {data.qrToken}
          </p>
        </div>
        <div className="flex justify-center sm:justify-end">
          <div className="rounded-3xl bg-white p-3 shadow-2xl">
            <QRCode
              value={data.qrToken}
              size={180}
              bgColor="#ffffff"
              fgColor="#020617"
              style={{ width: "180px", height: "180px" }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <section className="glass-panel space-y-4 p-6">
        <header>
          <h2 className="text-xl font-semibold text-white">닉네임</h2>
        </header>

        <div className="space-y-3">
          <input
            type="text"
            value={nicknameValue}
            disabled={data.nicknameLocked}
            onChange={(event) => setNicknameValue(event.target.value)}
            maxLength={20}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-orange-200 focus:outline-none disabled:opacity-60"
            placeholder="닉네임"
          />

          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => handleNicknameSubmit(false)}
              disabled={
                data.nicknameLocked ||
                isNicknamePending ||
                nicknameValue.trim().length === 0
              }
              aria-busy={isNicknamePending}
              className="flex-1 rounded-2xl border border-orange-300/60 bg-orange-400/20 px-4 py-2 font-semibold text-orange-100 transition hover:bg-orange-400/30 disabled:opacity-60"
            >
              {isNicknamePending ? "저장 중" : "저장"}
            </button>
            <button
              type="button"
              onClick={handleSuggestion}
              disabled={data.nicknameLocked || suggestionLoading}
              aria-busy={suggestionLoading}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {suggestionLoading ? "추천 중" : "추천"}
            </button>
            {!data.nicknameLocked ? (
              <button
                type="button"
                onClick={() => handleNicknameSubmit(true)}
                disabled={
                  data.nicknameLocked ||
                  isNicknamePending ||
                  nicknameValue.trim().length === 0
                }
                aria-busy={isNicknamePending}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                {isNicknamePending ? "확정 중" : "확정"}
              </button>
            ) : null}
          </div>

          {suggestions.length > 0 ? (
            <div
              className="flex flex-wrap gap-2 text-xs text-slate-200"
              aria-live="polite"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNicknameValue(suggestion)}
                  className="rounded-full border border-white/10 px-3 py-1 transition hover:border-orange-200 hover:text-orange-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {nicknameMessage ? (
            <p
              className="text-sm text-emerald-300"
              role="status"
              aria-live="polite"
            >
              {nicknameMessage}
            </p>
          ) : null}
          {nicknameError ? (
            <p
              className="text-sm text-rose-300"
              role="alert"
              aria-live="assertive"
            >
              {nicknameError}
            </p>
          ) : null}

          {data.nicknameLocked ? (
            <p className="text-sm text-slate-400">변경할 수 없습니다.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function describeProfile(student: StudentDashboardData) {
  const segments: string[] = [];

  if (typeof student.grade === "number") {
    segments.push(`${student.grade}학년`);
  }

  if (typeof student.classNumber === "number") {
    segments.push(`${student.classNumber}반`);
  }

  if (typeof student.studentNumber === "number") {
    segments.push(`${student.studentNumber}번`);
  }

  return segments.length > 0 ? segments.join(" ") : "정보 없음";
}

function RecentLogs({
  logs,
}: {
  logs: StudentDashboardData["recentLogs"];
}) {
  if (!logs || logs.length === 0) {
    return (
      <p
        className="mt-3 text-sm text-slate-400"
        role="status"
        aria-live="polite"
      >
        기록 없음
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3 text-sm" aria-live="polite">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/30 px-4 py-3"
        >
          <div>
            <p className="font-semibold text-white">{log.boothName}</p>
            <p className="text-xs text-slate-400">
              {logFormatter.format(new Date(log.awardedAt))}
            </p>
          </div>
          <span className="text-lg font-semibold text-emerald-300">
            +{log.points}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function requestJson(
  input: RequestInfo,
  init: RequestInit | undefined,
  fallbackMessage: string,
) {
  const response = await fetch(input, init);
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? ((payload as { message: string }).message || fallbackMessage)
        : fallbackMessage;

    throw new Error(message);
  }

  return payload as Record<string, unknown>;
}
