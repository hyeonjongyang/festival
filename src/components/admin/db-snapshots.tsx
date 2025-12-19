"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import type { DbActionResult } from "@/app/admin/db/actions";
import { dbActionInitialState, restoreDbSnapshot } from "@/app/admin/db/actions";
import type { DbTableKey } from "@/lib/admin/db-config";

type SnapshotItem = {
  id: string;
  action: string;
  createdAt: string;
  createdBy?: string | null;
  recordCount: number;
  note?: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  create: "생성 전",
  update: "수정 전",
  delete: "삭제 전",
  "bulk-delete": "테이블 삭제 전",
  reset: "전체 초기화 전",
  spreadsheet: "시트 변경 전",
  restore: "복구 전",
};

export function DbSnapshots({ tableKey, snapshots }: { tableKey: DbTableKey; snapshots: SnapshotItem[] }) {
  const [restoreState, restoreAction, restorePending] = useActionState<DbActionResult, FormData>(
    restoreDbSnapshot,
    { ...dbActionInitialState },
  );
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    if (!restorePending) {
      setPendingSnapshotId(null);
    }
  }, [restorePending]);

  const snapshotCountLabel = useMemo(() => `${snapshots.length.toLocaleString()}개`, [snapshots.length]);

  const handleSubmit = (snapshotId: string, createdAt: string) => (event: FormEvent<HTMLFormElement>) => {
    const displayDate = formatTimestamp(createdAt);
    const confirmed = window.confirm(`${displayDate} 스냅샷으로 복구하시겠습니까?\n현재 데이터는 덮어씌워집니다.`);
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    setPendingSnapshotId(snapshotId);
  };

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4 text-sm">
        <p className="font-semibold text-[var(--text-primary)]">변경 히스토리</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">최근 {snapshotCountLabel} 스냅샷을 보관합니다.</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          복구하면 현재 테이블 데이터가 스냅샷 기준으로 덮어씌워집니다.
        </p>
        <ActionMessage state={restoreState} />
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--outline)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--text-muted)]">
          아직 저장된 스냅샷이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snapshot) => {
            const actionLabel = ACTION_LABELS[snapshot.action] ?? snapshot.action;
            const createdBy = snapshot.createdBy ? ` · ${snapshot.createdBy}` : "";
            const createdAt = formatTimestamp(snapshot.createdAt);
            const isPending = restorePending && pendingSnapshotId === snapshot.id;

            return (
              <div
                key={snapshot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-3 text-xs"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{actionLabel}</p>
                  <p className="mt-1 text-[var(--text-muted)]">
                    {createdAt} · {snapshot.recordCount.toLocaleString()}건{createdBy}
                  </p>
                  {snapshot.note ? (
                    <p className="mt-1 text-[var(--text-muted)]">{snapshot.note}</p>
                  ) : null}
                </div>
                <form
                  action={restoreAction}
                  onSubmit={handleSubmit(snapshot.id, snapshot.createdAt)}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="table" value={tableKey} />
                  <input type="hidden" name="snapshotId" value={snapshot.id} />
                  <button
                    type="submit"
                    disabled={restorePending}
                    className="rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-primary)] transition hover:border-[var(--outline-strong)] disabled:opacity-60"
                  >
                    {isPending ? "복구 중…" : "이 스냅샷으로 복구"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ko-KR");
}

function ActionMessage({ state }: { state: DbActionResult }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
        state.ok
          ? "border-[var(--outline)] text-[var(--text-muted)]"
          : "border-[var(--danger)]/40 text-[var(--danger)]"
      }`}
    >
      {state.message}
    </p>
  );
}
