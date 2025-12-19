import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import {
  DB_TABLES,
  buildDbOrderBy,
  buildDbSelect,
  buildDbWhere,
  getDbTableConfig,
  normalizeParam,
  type DbTableKey,
} from "@/lib/admin/db-config";
import { DbActions } from "@/components/admin/db-actions";
import { DbSnapshots } from "@/components/admin/db-snapshots";
import { DbSpreadsheet } from "@/components/admin/db-spreadsheet";

type AdminDbPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const COUNT_KEY_ORDER: DbTableKey[] = [
  "users",
  "booths",
  "boothVisits",
  "posts",
  "accountBatches",
  "visitViolations",
  "featureFlags",
  "boothRatings",
];
const SNAPSHOT_LIMIT = 20;

export default async function AdminDbPage({ searchParams }: AdminDbPageProps) {
  await requireRole(["ADMIN"]);
  const resolvedSearchParams = await searchParams;

  const tableKey = normalizeParam(resolvedSearchParams.table);
  const filterField = normalizeParam(resolvedSearchParams.filterField);
  const filterValue = normalizeParam(resolvedSearchParams.filterValue);
  const sortField = normalizeParam(resolvedSearchParams.sortField);
  const sortDir = normalizeParam(resolvedSearchParams.sortDir);
  const limitParam = normalizeParam(resolvedSearchParams.limit);
  const activeId = normalizeParam(resolvedSearchParams.activeId);

  const tableConfig = getDbTableConfig(tableKey);
  const limit = parseLimit(limitParam);

  const where = buildDbWhere(tableConfig, filterField, filterValue) ?? undefined;
  const orderBy =
    buildDbOrderBy(tableConfig, sortField, sortDir) ??
    ({ [tableConfig.defaultSort.key]: tableConfig.defaultSort.dir } as Record<string, "asc" | "desc">);

  const rowsPromise = (prisma as unknown as Record<
    string,
    { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }
  >)[tableConfig.model].findMany({
    where,
    orderBy,
    take: limit,
    select: buildDbSelect(tableConfig),
  });

  const countsPromise = prisma.$transaction([
    prisma.user.count(),
    prisma.booth.count(),
    prisma.boothVisit.count(),
    prisma.post.count(),
    prisma.accountBatch.count(),
    prisma.visitViolation.count(),
    prisma.featureFlag.count(),
    prisma.boothRating.count(),
  ]);

  const snapshotsPromise = prisma.adminDbSnapshot.findMany({
    where: { tableKey: tableConfig.key },
    orderBy: { createdAt: "desc" },
    take: SNAPSHOT_LIMIT,
  });

  const [countResults, rows, snapshots] = await Promise.all([countsPromise, rowsPromise, snapshotsPromise]);

  const countMap = COUNT_KEY_ORDER.reduce<Record<DbTableKey, number>>((acc, key, index) => {
    acc[key] = countResults[index] ?? 0;
    return acc;
  }, {} as Record<DbTableKey, number>);

  const filterOptions = tableConfig.columns.filter((column) => column.filterable !== false);
  const sortOptions = tableConfig.columns.filter((column) => column.sortable !== false);
  const activeFilterField = filterOptions.some((column) => column.key === filterField) ? filterField : "";
  const effectiveFilterValue = activeFilterField ? filterValue : null;
  const activeSortField =
    sortOptions.find((column) => column.key === sortField)?.key ?? tableConfig.defaultSort.key;
  const activeSortDir = sortDir === "desc" ? "desc" : "asc";
  const exportBaseParams = buildSearchParams({
    table: tableConfig.key,
    filterField: activeFilterField,
    filterValue: effectiveFilterValue,
    sortField: activeSortField,
    sortDir: activeSortDir,
  });
  const spreadsheetParams = {
    table: tableConfig.key,
    filterField: activeFilterField,
    filterValue: effectiveFilterValue,
    limit: String(limit),
  };
  const snapshotItems = snapshots.map((snapshot) => ({
    id: snapshot.id,
    action: snapshot.action,
    createdAt: snapshot.createdAt.toISOString(),
    createdBy: snapshot.createdBy,
    recordCount: snapshot.recordCount,
    note: snapshot.note,
  }));

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col gap-4 px-4 pb-24 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="chip inline-flex">DB 관리</p>
          <h1 className="mt-2 text-2xl font-semibold">관리자 DB 콘솔</h1>
          <p className="text-sm text-[var(--text-muted)]">
            스프레드시트처럼 직접 셀을 수정할 수 있습니다. 저장은 자동 반영됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={`/api/admin/db/export?${exportBaseParams.toString()}&format=json`}
            className="rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-primary)]"
          >
            JSON 내보내기
          </a>
          <a
            href={`/api/admin/db/export?${exportBaseParams.toString()}&format=csv`}
            className="rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-primary)]"
          >
            CSV 내보내기
          </a>
        </div>
      </header>

      <section className="soft-scrollbar flex gap-2 overflow-x-auto pb-1 text-xs">
        {DB_TABLES.map((table) => {
          const isActive = table.key === tableConfig.key;
          return (
            <a
              key={table.key}
              href={`/admin/db?table=${table.key}`}
              className={isActive
                ? "rounded-full border border-[var(--accent)]/60 bg-[var(--accent-soft)] px-3 py-1 text-[var(--text-primary)]"
                : "rounded-full border border-[var(--outline)] px-3 py-1 text-[var(--text-muted)]"}
            >
              {table.label} · {countMap[table.key].toLocaleString()}
            </a>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4 text-sm">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="table" value={tableConfig.key} />
          <label className="flex flex-col gap-1">
            필터 열
            <select
              name="filterField"
              defaultValue={activeFilterField ?? ""}
              className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <option value="">선택 안 함</option>
              {filterOptions.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            필터 값
            <input
              type="text"
              name="filterValue"
              defaultValue={activeFilterField ? filterValue ?? "" : ""}
              placeholder="예: ADMIN / 2024-01-01"
              className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            정렬 열
            <select
              name="sortField"
              defaultValue={activeSortField ?? ""}
              className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            >
              {sortOptions.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            정렬 방향
            <select
              name="sortDir"
              defaultValue={activeSortDir}
              className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <option value="asc">오름차순 (A → Z)</option>
              <option value="desc">내림차순 (Z → A)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            표시 개수
            <select
              name="limit"
              defaultValue={String(limit)}
              className="rounded-2xl border border-[var(--outline)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <option value="20">20</option>
              <option value="40">40</option>
              <option value="80">80</option>
              <option value="120">120</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            적용
          </button>
          <a
            href={`/admin/db?table=${tableConfig.key}`}
            className="rounded-2xl border border-[var(--outline)] px-4 py-2 text-sm text-[var(--text-primary)]"
          >
            초기화
          </a>
        </form>
      </section>

      <DbSpreadsheet
        tableKey={tableConfig.key}
        idField={tableConfig.idField}
        columns={tableConfig.columns}
        initialRows={rows}
        activeId={activeId}
        sortField={activeSortField}
        sortDir={activeSortDir}
        queryParams={spreadsheetParams}
        className="flex-1 -mx-4"
      />

      <details className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">변경 히스토리 열기</summary>
        <div className="mt-4">
          <DbSnapshots tableKey={tableConfig.key} snapshots={snapshotItems} />
        </div>
      </details>

      <details className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
          데이터 관리 작업 열기
        </summary>
        <div className="mt-4">
          <DbActions
            tableKey={tableConfig.key}
            tableLabel={tableConfig.label}
            idLabel={tableConfig.idLabel}
            columns={tableConfig.columns}
            createExample={tableConfig.createExample}
            updateExample={tableConfig.updateExample}
            activeId={activeId}
          />
        </div>
      </details>
    </div>
  );
}

function parseLimit(value: string | null) {
  const parsed = value ? Number(value) : NaN;
  const allowed = new Set([20, 40, 80, 120]);
  if (Number.isFinite(parsed) && allowed.has(parsed)) {
    return parsed;
  }
  return 40;
}

function buildSearchParams(params: Record<string, string | null | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  return searchParams;
}
