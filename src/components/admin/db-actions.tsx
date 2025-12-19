"use client";

import { useActionState } from "react";
import type { DbColumn, DbTableKey } from "@/lib/admin/db-config";
import type { DbActionResult } from "@/app/admin/db/actions";
import {
  createDbRecord,
  updateDbRecord,
  deleteDbRecord,
  bulkDeleteTable,
  resetDatabase,
  dbActionInitialState,
} from "@/app/admin/db/actions";

type DbActionsProps = {
  tableKey: DbTableKey;
  tableLabel: string;
  idLabel: string;
  columns: DbColumn[];
  createExample: string;
  updateExample: string;
  activeId?: string | null;
};

export function DbActions({
  tableKey,
  tableLabel,
  idLabel,
  columns,
  createExample,
  updateExample,
  activeId,
}: DbActionsProps) {
  const [createState, createAction, createPending] = useActionState<DbActionResult, FormData>(
    createDbRecord,
    { ...dbActionInitialState },
  );
  const [updateState, updateAction, updatePending] = useActionState<DbActionResult, FormData>(
    updateDbRecord,
    { ...dbActionInitialState },
  );
  const [deleteState, deleteAction, deletePending] = useActionState<DbActionResult, FormData>(
    deleteDbRecord,
    { ...dbActionInitialState },
  );
  const [bulkState, bulkAction, bulkPending] = useActionState<DbActionResult, FormData>(
    bulkDeleteTable,
    { ...dbActionInitialState },
  );
  const [resetState, resetAction, resetPending] = useActionState<DbActionResult, FormData>(
    resetDatabase,
    { ...dbActionInitialState },
  );

  const confirmToken = tableKey.toUpperCase();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4">
        <header>
          <p className="text-sm font-semibold text-[var(--text-primary)]">필드 안내</p>
          <p className="text-xs text-[var(--text-muted)]">표시 가능한 컬럼: {columns.map((col) => col.key).join(", ")}</p>
        </header>
      </div>

      <details className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4" open>
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
          새 레코드 생성
        </summary>
        <form action={createAction} className="mt-3 space-y-3">
          <input type="hidden" name="table" value={tableKey} />
          <label className="text-sm">
            JSON 입력
            <textarea
              name="payload"
              rows={7}
              placeholder={createExample}
              className="mt-2 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2 text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {createPending ? "생성 중…" : `${tableLabel} 생성`}
          </button>
          <ActionMessage state={createState} />
        </form>
      </details>

      <details className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
          레코드 수정
        </summary>
        <form action={updateAction} className="mt-3 space-y-3">
          <input type="hidden" name="table" value={tableKey} />
          <label className="text-sm">
            {idLabel}
            <input
              type="text"
              name="recordId"
              defaultValue={activeId ?? ""}
              className="mt-2 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            JSON 입력
            <textarea
              name="payload"
              rows={6}
              placeholder={updateExample}
              className="mt-2 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2 text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={updatePending}
            className="w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--outline-strong)] disabled:opacity-60"
          >
            {updatePending ? "수정 중…" : "수정 적용"}
          </button>
          <ActionMessage state={updateState} />
        </form>
      </details>

      <details className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
          레코드 삭제
        </summary>
        <form action={deleteAction} className="mt-3 space-y-3">
          <input type="hidden" name="table" value={tableKey} />
          <label className="text-sm">
            {idLabel}
            <input
              type="text"
              name="recordId"
              defaultValue={activeId ?? ""}
              className="mt-2 w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={deletePending}
            className="w-full rounded-2xl border border-[var(--danger)]/50 bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--danger)] transition hover:border-[var(--danger)] disabled:opacity-60"
          >
            {deletePending ? "삭제 중…" : "레코드 삭제"}
          </button>
          <ActionMessage state={deleteState} />
        </form>
      </details>

      <details className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--danger)]">
          {tableLabel} 전체 삭제
        </summary>
        <form action={bulkAction} className="mt-3 space-y-3">
          <input type="hidden" name="table" value={tableKey} />
          <p className="text-xs text-[var(--text-muted)]">
            확인 문구 <span className="font-semibold text-[var(--text-primary)]">{confirmToken}</span> 를 입력해야 실행됩니다.
          </p>
          <input
            type="text"
            name="confirm"
            placeholder={confirmToken}
            className="w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={bulkPending}
            className="w-full rounded-2xl border border-[var(--danger)]/60 bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--danger)] transition hover:border-[var(--danger)] disabled:opacity-60"
          >
            {bulkPending ? "삭제 중…" : "테이블 비우기"}
          </button>
          <ActionMessage state={bulkState} />
        </form>
      </details>

      <details className="rounded-2xl border border-[var(--danger)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--danger)]">전체 DB 초기화</summary>
        <form action={resetAction} className="mt-3 space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            모든 테이블을 비웁니다. 확인 문구 <span className="font-semibold text-[var(--text-primary)]">RESET-ALL</span>
            을 입력하세요.
          </p>
          <input
            type="text"
            name="confirm"
            placeholder="RESET-ALL"
            className="w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={resetPending}
            className="w-full rounded-2xl border border-[var(--danger)]/60 bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--danger)] transition hover:border-[var(--danger)] disabled:opacity-60"
          >
            {resetPending ? "초기화 중…" : "전체 초기화 실행"}
          </button>
          <ActionMessage state={resetState} />
        </form>
      </details>
    </section>
  );
}

function ActionMessage({ state }: { state: DbActionResult }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-2xl border px-4 py-3 text-sm ${
        state.ok
          ? "border-[var(--outline)] text-[var(--text-muted)]"
          : "border-[var(--danger)]/40 text-[var(--danger)]"
      }`}
    >
      {state.message}
    </p>
  );
}
