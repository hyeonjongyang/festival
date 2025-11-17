"use client";

import { useActionState } from "react";
import type { StudentBatchResult, BoothBatchResult, AdminBatchResult } from "@/lib/accounts/types";
import type { ActionResult } from "@/app/admin/accounts/actions";
import {
  submitStudentBatch,
  submitBoothBatch,
  submitAdminBatch,
  toggleRegistrationAction,
} from "@/app/admin/accounts/actions";

const initialState: ActionResult = { ok: false, message: "" };

export function StudentBatchForm() {
  const [state, formAction, pending] = useActionState<ActionResult<StudentBatchResult | undefined>>(
    submitStudentBatch,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <header>
        <p className="chip inline-flex">학생 배치</p>
        <h2 className="mt-2 text-2xl font-semibold">학년 전체 계정 생성</h2>
        <p className="text-sm text-[var(--text-muted)]">학년 범위, 반/학생 수, 시작 번호를 입력하면 Excel이 자동으로 생성됩니다.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          시작 학년
          <input type="number" name="gradeFrom" required className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          끝 학년
          <input type="number" name="gradeTo" required className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          학년당 반 수
          <input type="number" name="classCount" required className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          반당 학생 수
          <input type="number" name="studentsPerClass" required className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          시작 번호
          <input type="number" name="startNumber" defaultValue={1} required className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "생성 중…" : "Excel 생성"}
      </button>

      {state.message && !state.ok ? (
        <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}

      {state.ok && state.message ? (
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">{state.message}</span>
          {state.payload?.downloadPath ? (
            <a href={state.payload.downloadPath} className="ml-3 text-[var(--text-primary)] underline">
              Excel 다운로드
            </a>
          ) : null}
        </p>
      ) : null}

      {state.ok && state.payload?.previewAccounts?.length ? (
        <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)]">미리보기</p>
          <ul className="mt-2 space-y-1">
            {state.payload.previewAccounts.map((student) => (
              <li key={`${student.grade}-${student.classNumber}-${student.studentNumber}`}>{`${student.grade}학년 ${student.classNumber}반 ${student.studentNumber}번 · ${student.code} · 학번 ${student.studentId}`}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}

export function BoothAccountsForm() {
  const [state, formAction, pending] = useActionState<ActionResult<BoothBatchResult | undefined>>(
    submitBoothBatch,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <header>
        <p className="chip inline-flex">부스 관리자</p>
        <h2 className="mt-2 text-2xl font-semibold">부스 계정 묶음 발급</h2>
      </header>
      <label className="text-sm">
        기본 부스명
        <input type="text" name="baseName" required className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm">
        생성 개수
        <input type="number" name="count" required className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm">
        위치 (선택)
        <input type="text" name="location" className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm">
        소개 (선택)
        <textarea name="description" rows={3} className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "생성 중…" : "부스 계정 생성"}
      </button>
      {state.message && !state.ok ? (
        <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">{state.message}</span>
        </p>
      ) : null}
      {state.ok && state.payload?.accounts?.length ? (
        <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)]">발급 목록</p>
          <ul className="mt-2 space-y-1">
            {state.payload.accounts.map((account) => (
              <li key={`${account.boothName}-${account.code}`}>{`${account.boothName} · 코드 ${account.code}`}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}

export function AdminAccountsForm() {
  const [state, formAction, pending] = useActionState<ActionResult<AdminBatchResult | undefined>>(
    submitAdminBatch,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <header>
        <p className="chip inline-flex">전체 관리자</p>
        <h2 className="mt-2 text-2xl font-semibold">운영 계정 발급</h2>
      </header>
      <label className="text-sm">
        기본 라벨
        <input type="text" name="label" required className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm">
        개수
        <input type="number" name="count" required className="mt-1 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "생성 중…" : "관리자 생성"}
      </button>
      {state.message && !state.ok ? (
        <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">{state.message}</span>
        </p>
      ) : null}
    </form>
  );
}

export function BoothRegistrationToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult>(toggleRegistrationAction, {
    ok: true,
    message: initialEnabled ? "부스 접수 중" : "부스 접수 종료",
  });

  return (
    <form action={formAction} className="space-y-3">
      <p className="font-semibold text-[var(--text-primary)]">부스 등록 기능</p>
      <p className="text-sm text-[var(--text-muted)]">현장 상황에 따라 부스 자가 등록 기능을 즉시 켜거나 끌 수 있습니다.</p>
      <div className="flex gap-3">
        <button
          type="submit"
          name="enabled"
          value="true"
          disabled={pending}
          className="flex-1 rounded-2xl border border-[var(--outline)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          열기
        </button>
        <button
          type="submit"
          name="enabled"
          value="false"
          disabled={pending}
          className="flex-1 rounded-2xl border border-[var(--outline)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          닫기
        </button>
      </div>
      {state.message && !state.ok ? (
        <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--text-muted)]">
          현재 상태 · <span className="font-semibold text-[var(--text-primary)]">{state.message}</span>
        </p>
      ) : null}
    </form>
  );
}
