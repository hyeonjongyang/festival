"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import type { DbColumn, DbTableKey } from "@/lib/admin/db-config";
import { jsonFetch } from "@/lib/client/http";
import { cn } from "@/lib/client/cn";

type DbSpreadsheetProps = {
  tableKey: DbTableKey;
  idField: string;
  columns: DbColumn[];
  initialRows: Record<string, unknown>[];
  initialHasMore: boolean;
  pageSize: number;
  totalCount?: number;
  activeId?: string | null;
  sortField: string;
  sortDir: "asc" | "desc";
  queryParams: Record<string, string | null | undefined>;
  className?: string;
};

type UpdateResponse = {
  record: Record<string, unknown>;
};

export function DbSpreadsheet({
  tableKey,
  idField,
  columns,
  initialRows,
  initialHasMore,
  pageSize,
  totalCount,
  activeId,
  sortField,
  sortDir,
  queryParams,
  className,
}: DbSpreadsheetProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>(initialRows);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "idle" | "saving" | "success" | "error"; message: string }>(
    { tone: "idle", message: "" },
  );
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const tableVersionRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    tableVersionRef.current += 1;
    setRows(initialRows);
    setDrafts((prev) => pruneDrafts(prev, initialRows, idField));
    setPendingCell(null);
    setActiveCell(null);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
    setLoadError(null);
    setStatus({ tone: "idle", message: "" });
  }, [initialRows, tableKey, idField, initialHasMore]);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [sortField, sortDir, tableKey]);

  const statusTone = status.tone === "error" ? "text-[var(--danger)]" : "text-[var(--text-muted)]";

  const columnLetters = useMemo(
    () => columns.map((_, index) => numberToLetters(index + 1)),
    [columns],
  );

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params;
  }, [queryParams]);

  const buildRecordsParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams(baseParams);
      params.set("table", tableKey);
      params.set("sortField", sortField);
      params.set("sortDir", sortDir);
      params.set("offset", String(offset));
      params.set("limit", String(pageSize));
      return params;
    },
    [baseParams, pageSize, sortDir, sortField, tableKey],
  );

  const getSortHref = (columnKey: string, sortable: boolean) => {
    if (!sortable) {
      return `/admin/db?${baseParams.toString()}`;
    }
    const params = new URLSearchParams(baseParams);
    const nextDir = columnKey === sortField ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    params.set("sortField", columnKey);
    params.set("sortDir", nextDir);
    return `/admin/db?${params.toString()}`;
  };

  const getRecordKey = (row: Record<string, unknown>, rowIndex: number) => {
    const recordId = row[idField];
    return recordId === null || recordId === undefined || recordId === "" ? String(rowIndex) : String(recordId);
  };

  const getCellKey = (recordKey: string, columnKey: string) => `${recordKey}::${columnKey}`;

  const getCellValue = (row: Record<string, unknown>, column: DbColumn, recordKey: string) => {
    const draftKey = getCellKey(recordKey, column.key);
    if (draftKey in drafts) {
      return drafts[draftKey] ?? "";
    }
    return formatCellInput(row[column.key], column);
  };

  const updateDraft = (recordKey: string, columnKey: string, value: string) => {
    const draftKey = getCellKey(recordKey, columnKey);
    setDrafts((prev) => ({ ...prev, [draftKey]: value }));
  };

  const revertDraft = (recordKey: string, columnKey: string) => {
    const draftKey = getCellKey(recordKey, columnKey);
    setDrafts((prev) => {
      if (!(draftKey in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const pendingEdits = useMemo(() => {
    const edits: Array<{
      key: string;
      recordId: string;
      field: string;
      value: string;
    }> = [];

    Object.entries(drafts).forEach(([key, value]) => {
      const [recordId, field] = key.split("::");
      if (!recordId || !field) {
        return;
      }
      const row = rows.find((item) => String(item[idField] ?? "") === recordId);
      const column = columns.find((col) => col.key === field);
      if (!row || !column) {
        return;
      }
      const originalValue = formatCellInput(row[column.key], column);
      if (value === originalValue) {
        return;
      }
      edits.push({ key, recordId, field, value });
    });

    return edits;
  }, [drafts, rows, columns, idField]);

  const hasPendingChanges = pendingEdits.length > 0;

  const discardChanges = useCallback(() => {
    setDrafts({});
    setStatus({ tone: "idle", message: "변경 사항을 되돌렸습니다." });
    setPendingCell(null);
  }, []);

  const appendRows = useCallback(
    (nextRows: Record<string, unknown>[]) => {
      if (nextRows.length === 0) {
        return;
      }
      setRows((prev) => {
        const existing = new Set(prev.map((row) => String(row[idField] ?? "")));
        const appended = nextRows.filter((row) => {
          const key = String(row[idField] ?? "");
          if (!key) {
            return true;
          }
          if (existing.has(key)) {
            return false;
          }
          existing.add(key);
          return true;
        });
        return appended.length > 0 ? [...prev, ...appended] : prev;
      });
    },
    [idField],
  );

  const loadMoreRows = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }
    const version = tableVersionRef.current;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = buildRecordsParams(rows.length);
      const response = await jsonFetch<{ rows: Record<string, unknown>[]; hasMore: boolean }>(
        `/api/admin/db/records?${params.toString()}`,
      );
      if (tableVersionRef.current !== version) {
        return;
      }
      appendRows(response.rows);
      setHasMore(response.hasMore);
    } catch (error) {
      if (tableVersionRef.current !== version) {
        return;
      }
      setLoadError(error instanceof Error ? error.message : "추가 데이터를 불러오지 못했습니다.");
    } finally {
      if (tableVersionRef.current === version) {
        setIsLoadingMore(false);
      }
    }
  }, [appendRows, buildRecordsParams, hasMore, isLoadingMore, rows.length]);

  const applyChanges = useCallback(async () => {
    if (isApplying) {
      return;
    }
    if (pendingEdits.length === 0) {
      setStatus({ tone: "idle", message: "적용할 변경 사항이 없습니다." });
      return;
    }

    setIsApplying(true);
    setStatus({ tone: "saving", message: "스냅샷 저장 중…" });

    try {
      await jsonFetch<{ id: string }>("/api/admin/db/snapshots", {
        method: "POST",
        body: JSON.stringify({
          table: tableKey,
          action: "spreadsheet",
          note: `${pendingEdits.length}건 변경`,
        }),
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "스냅샷 저장에 실패했습니다.",
      });
      setPendingCell(null);
      setIsApplying(false);
      return;
    }

    setStatus({ tone: "saving", message: `${pendingEdits.length}건 적용 중…` });

    const successKeys = new Set<string>();
    const updatedRecords = new Map<string, Record<string, unknown>>();
    let failures = 0;

    for (const edit of pendingEdits) {
      setPendingCell(edit.key);
      try {
        const payload = {
          table: tableKey,
          recordId: edit.recordId,
          field: edit.field,
          value: edit.value,
          skipSnapshot: true,
        };
        const response = await jsonFetch<UpdateResponse>("/api/admin/db/records", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        updatedRecords.set(edit.recordId, response.record);
        successKeys.add(edit.key);
      } catch {
        failures += 1;
      }
    }

    setRows((prev) =>
      prev.map((row) => {
        const recordId = String(row[idField] ?? "");
        return updatedRecords.get(recordId) ?? row;
      }),
    );

    setDrafts((prev) => {
      if (successKeys.size === 0) {
        return prev;
      }
      const next = { ...prev };
      successKeys.forEach((key) => {
        delete next[key];
      });
      return next;
    });

    if (failures > 0) {
      setStatus({ tone: "error", message: `${failures}건 적용에 실패했습니다.` });
    } else {
      setStatus({ tone: "success", message: `${pendingEdits.length}건 적용 완료` });
    }

    setPendingCell(null);
    setIsApplying(false);
  }, [isApplying, pendingEdits, tableKey, idField]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, recordKey: string, column: DbColumn) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      revertDraft(recordKey, column.key);
      event.currentTarget.blur();
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void applyChanges();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
      event.preventDefault();
      discardChanges();
    }
  };

  useEffect(() => {
    const handleGlobalKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void applyChanges();
      }
      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        discardChanges();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [applyChanges, discardChanges]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = loadMoreRef.current;
    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreRows();
        }
      },
      { root, rootMargin: "240px 0px 360px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreRows]);

  const rowCountLabel =
    typeof totalCount === "number"
      ? `${rows.length.toLocaleString()} / ${totalCount.toLocaleString()} rows`
      : `${rows.length.toLocaleString()} rows`;

  return (
    <section className={cn("flex flex-1 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span className="rounded-full border border-[var(--outline)] px-2 py-1">{rowCountLabel}</span>
          <span className="rounded-full border border-[var(--outline)] px-2 py-1">{columns.length} columns</span>
          <span className="rounded-full border border-[var(--outline)] px-2 py-1">
            변경 {pendingEdits.length.toLocaleString()}건
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={discardChanges}
            disabled={!hasPendingChanges || isApplying}
            className="rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-primary)] disabled:opacity-50"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={() => void applyChanges()}
            disabled={!hasPendingChanges || isApplying}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-white disabled:opacity-50"
          >
            변경 적용
          </button>
          <span className={cn("text-xs", statusTone)}>{status.message}</span>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        단축키 · 변경 적용: Ctrl/Cmd+Enter · 되돌리기: Ctrl/Cmd+Shift+Z · 셀 취소: Esc
      </p>

      <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface)] shadow-[var(--shadow-pop)]">
        <div ref={scrollRef} className="db-sheet-scroll soft-scrollbar h-full overflow-auto">
          <table
            data-reveal="skip"
            className="min-w-max w-full border-separate border-spacing-0 text-xs"
          >
            <thead className="sticky top-0 z-20 bg-[var(--surface-muted)]">
              <tr className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <th className="sticky left-0 z-30 w-12 min-w-[48px] border-b border-r border-[var(--outline)] bg-[var(--surface-muted)] px-2 py-2 text-center font-semibold">
                  #
                </th>
                {columns.map((column, index) => {
                  const sortable = column.sortable !== false;
                  const isSorted = sortField === column.key && sortable;
                  const sortLabel = isSorted ? (sortDir === "asc" ? "오름차순" : "내림차순") : "정렬";
                  const ariaSort = isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none";
                  const href = getSortHref(column.key, sortable);

                  return (
                    <th
                      key={column.key}
                      aria-sort={ariaSort}
                      className={cn(
                        "min-w-[160px] border-b border-r border-[var(--outline)] bg-[var(--surface-muted)] px-2 py-2 text-left font-semibold",
                        isSorted && "bg-[var(--accent-soft)]",
                      )}
                    >
                      {sortable ? (
                        <Link
                          href={href}
                          className="group block rounded-lg px-2 py-1 transition hover:bg-[var(--surface-muted)]"
                        >
                          <span className="block text-[10px] text-[var(--text-muted)]">{columnLetters[index]}</span>
                          <span className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-primary)]">
                            <span>{column.label}</span>
                            <span className={cn("text-[10px] text-[var(--text-muted)]", isSorted && "text-[var(--accent)]")}>
                              {sortLabel}
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <div className="px-2 py-1">
                          <span className="block text-[10px] text-[var(--text-muted)]">{columnLetters[index]}</span>
                          <span className="block text-[12px] text-[var(--text-primary)]">{column.label}</span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowId = row[idField];
                const rowKey = getRecordKey(row, rowIndex);
                const isActiveRow = activeId && String(rowId) === activeId;
                const baseTone = rowIndex % 2 === 0 ? "bg-[var(--bg-secondary)]" : "bg-[var(--surface-muted)]";
                const rowTone = isActiveRow ? "bg-[var(--accent-soft)]" : baseTone;

                return (
                  <tr key={rowKey} className={cn(isActiveRow && "text-[var(--text-primary)]")}>
                    <td
                      className={cn(
                        "sticky left-0 z-10 w-12 min-w-[48px] border-b border-r border-[var(--outline)] px-2 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)]",
                        rowTone,
                      )}
                    >
                      {rowIndex + 1}
                    </td>
                    {columns.map((column) => {
                      const cellKey = getCellKey(rowKey, column.key);
                      const value = getCellValue(row, column, rowKey);
                      const isPending = pendingCell === cellKey;
                      const isActive = activeCell === cellKey;

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "min-w-[160px] border-b border-r border-[var(--outline)] px-2 py-1 align-top",
                            rowTone,
                            isActive && "outline outline-1 outline-[var(--accent)]",
                          )}
                        >
                          <input
                            aria-label={`${column.label} (${rowIndex + 1}행)`}
                            value={value}
                            onChange={(event) => updateDraft(rowKey, column.key, event.target.value)}
                            onBlur={() => setActiveCell(null)}
                            onFocus={() => setActiveCell(cellKey)}
                            onKeyDown={(event) => handleKeyDown(event, rowKey, column)}
                            disabled={isPending || isApplying}
                            className={cn(
                              "h-8 w-full bg-transparent px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none",
                              (isPending || isApplying) && "opacity-60",
                            )}
                            title={value}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div ref={loadMoreRef} className="h-10" role="presentation" />
          {(isLoadingMore || loadError || !hasMore) && (
            <div className="px-4 pb-4 text-center text-[11px] text-[var(--text-muted)]">
              {loadError ? (
                <button
                  type="button"
                  onClick={() => void loadMoreRows()}
                  className="rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-primary)]"
                >
                  다시 시도
                </button>
              ) : isLoadingMore ? (
                "추가 데이터 로딩 중…"
              ) : (
                "모든 행을 불러왔습니다."
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatCellInput(value: unknown, column: DbColumn) {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  switch (column.type) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value as number) ? String(value) : "";
    case "json":
      return JSON.stringify(value);
    case "date": {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
    }
    default:
      return String(value);
  }
}

function numberToLetters(value: number) {
  let result = "";
  let current = value;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function pruneDrafts(
  drafts: Record<string, string>,
  rows: Record<string, unknown>[],
  idField: string,
) {
  if (rows.length === 0) {
    return {};
  }
  const recordIds = new Set(
    rows
      .map((row, index) => {
        const recordId = row[idField];
        return recordId === null || recordId === undefined || recordId === "" ? String(index) : String(recordId);
      })
      .filter(Boolean),
  );

  return Object.entries(drafts).reduce<Record<string, string>>((acc, [key, value]) => {
    const [recordId] = key.split("::");
    if (recordId && recordIds.has(recordId)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}
