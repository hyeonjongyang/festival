"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { useBoothDashboard } from "@/hooks/use-booth-dashboard";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { session, setSession } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSignOut = async () => {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/code-login", { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message ?? "세션을 종료하지 못했습니다.");
      }
      setSession(null);
      onClose();
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "세션을 종료하지 못했습니다.";
      setMessage(message);
    } finally {
      setPending(false);
    }
  };

  const isStudent = session?.role === "STUDENT";
  const displayName = isStudent
    ? session?.studentId ?? "학번 미지정"
    : session?.nickname ?? "로그인이 필요합니다";
  const initials =
    (isStudent
      ? session?.studentId?.slice(0, 2)
      : session?.nickname?.slice(0, 2)?.toUpperCase()) ?? "FC";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-10 pt-24">
      <button aria-label="모달 닫기" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="프로필 패널"
        className="glass-card frosted relative z-10 w-full max-w-md rounded-[28px] p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">종촌고등학교 부스 한마당</p>
            <h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              {displayName}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">{session ? describeRole(session.role) : "모든 기능을 사용하려면 로그인하세요."}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] text-lg font-semibold text-[var(--accent)]">
            {initials}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Link
            href="/feed"
            className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-3 text-center font-semibold text-[var(--text-primary)] transition hover:border-[var(--outline-strong)]"
          >
            피드로 이동
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending || !session}
            className="rounded-2xl border border-[var(--outline)] bg-[var(--bg-secondary)] px-4 py-3 font-semibold text-[var(--danger)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
          >
            로그아웃
          </button>
        </div>

        {message ? (
          <p className="mt-3 rounded-2xl border border-[var(--outline)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--danger)]">
            {message}
          </p>
        ) : null}

        <div className="mt-4 max-h-[50vh] space-y-4 overflow-y-auto pr-2 text-sm">
          {session?.role === "STUDENT" ? <StudentDashboard variant="compact" /> : null}
          {session?.role === "BOOTH_MANAGER" ? <BoothProfileSummary /> : null}
          {session?.role === "ADMIN" ? <AdminQuickLinks /> : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 block w-full rounded-2xl border border-transparent bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
        >
          패널 닫기
        </button>
      </div>
    </div>
  );
}

function describeRole(role?: string | null) {
  switch (role) {
    case "STUDENT":
      return "학생 계정";
    case "BOOTH_MANAGER":
      return "부스 운영팀";
    case "ADMIN":
      return "전체 관리자";
    default:
      return "손님";
  }
}

function BoothProfileSummary() {
  const { dashboard } = useBoothDashboard(undefined, 20000);

  if (!dashboard) {
    return (
      <p className="rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
        부스 요약을 불러오는 중입니다…
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">My Booth</p>
      <p className="text-lg font-semibold text-[var(--text-primary)]">{dashboard.booth.name}</p>
      <p className="text-xs text-[var(--text-muted)]">{dashboard.booth.location ?? "위치 미정"}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">부스 QR은 방문 현황 페이지에서 내려받을 수 있습니다.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-2xl border border-[var(--outline)] px-3 py-2">
          <p className="text-[var(--text-muted)]">누적</p>
          <p className="text-lg font-semibold text-[var(--accent)]">{dashboard.stats.totalVisits}</p>
        </div>
        <div className="rounded-2xl border border-[var(--outline)] px-3 py-2">
          <p className="text-[var(--text-muted)]">고유 방문</p>
          <p className="text-lg font-semibold text-[var(--accent)]">{dashboard.stats.uniqueVisitors}</p>
        </div>
      </div>
      <Link href="/booth/visits" className="mt-3 inline-flex text-xs text-[var(--accent)]">
        방문 콘솔 열기
      </Link>
    </div>
  );
}

function AdminQuickLinks() {
  return (
    <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">운영 바로가기</p>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        <Link href="/admin/dashboard" className="rounded-2xl border border-[var(--outline)] px-4 py-2 text-[var(--text-primary)]">
          대시보드
        </Link>
        <Link href="/admin/accounts" className="rounded-2xl border border-[var(--outline)] px-4 py-2 text-[var(--text-primary)]">
          계정 허브
        </Link>
        <Link href="/admin/db" className="rounded-2xl border border-[var(--outline)] px-4 py-2 text-[var(--text-primary)]">
          DB 관리
        </Link>
      </div>
    </div>
  );
}
