"use client";

import type { StudentDashboardData } from "@/types/api";
import { useStudentDashboard } from "@/hooks/use-student-dashboard";
import { formatCompactDate } from "@/lib/client/time";
import { StarMeter } from "@/components/chrome/star-meter";

type StudentDashboardProps = {
  initial?: StudentDashboardData | null;
  variant?: "full" | "compact";
};

export function StudentDashboard({ initial, variant = "full" }: StudentDashboardProps) {
  const { student, isValidating } = useStudentDashboard(initial, {
    refreshInterval: variant === "full" ? 20000 : undefined,
  });

  if (!student) {
    return (
      <p className="rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
        학생 정보를 불러오는 중입니다…
      </p>
    );
  }

  const gradeLabel =
    typeof student.grade === "number" && typeof student.classNumber === "number"
      ? `${student.grade}학년 ${student.classNumber}반`
      : "학년 정보 없음";
  const numberLabel =
    typeof student.studentNumber === "number" ? `${student.studentNumber}번` : "번호 미지정";

  return (
    <div className="space-y-4">
      <section className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Visit Count</p>
            <p className="text-4xl font-semibold text-[var(--accent)]">{student.visitCount}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {gradeLabel} · {numberLabel}
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-muted)]">
            {isValidating ? "자동 새로고침 중" : "실시간 동기화"}
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">학번</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            {student.studentId ?? "학번 미지정"}
          </p>
        </div>
      </section>

      {variant === "full" ? (
        <section className="p-5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">방문 안내</p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
            <li>기본 카메라(또는 피드 상단의 QR 스캐너)로 부스 QR을 스캔하세요.</li>
            <li>같은 부스는 한 번만 방문할 수 있습니다.</li>
            <li>QR 링크/토큰이 인식되지 않으면 문자열을 직접 입력할 수 있습니다.</li>
          </ul>
        </section>
      ) : null}

      <section className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[var(--text-primary)]">최근 방문</p>
          <span className="text-xs text-[var(--text-muted)]">최근 {student.recentVisits.length}개</span>
        </div>
        {student.recentVisits.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">아직 방문 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {student.recentVisits.map((visit) => (
              <li
                key={visit.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--outline)] px-4 py-2"
              >
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{visit.boothName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatCompactDate(visit.visitedAt)}</p>
                </div>
                <div className="flex flex-col items-end">
                  <StarMeter value={visit.rating} size="sm" muted className="mb-1" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {visit.rating ? `${visit.rating}.0 / 5` : "미평가"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
