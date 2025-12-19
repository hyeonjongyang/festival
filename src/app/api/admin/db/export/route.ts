import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  buildDbOrderBy,
  buildDbSelect,
  buildDbWhere,
  findDbTableConfig,
  normalizeParam,
  type DbColumn,
  type DbColumnType,
} from "@/lib/admin/db-config";

export async function GET(request: NextRequest) {
  const session = await getSessionUser();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const tableKey = normalizeParam(searchParams.get("table"));
  const config = findDbTableConfig(tableKey);

  if (!config) {
    return NextResponse.json({ error: "테이블이 올바르지 않습니다." }, { status: 400 });
  }

  const filterField = normalizeParam(searchParams.get("filterField"));
  const filterValue = normalizeParam(searchParams.get("filterValue"));
  const sortField = normalizeParam(searchParams.get("sortField"));
  const sortDir = normalizeParam(searchParams.get("sortDir"));
  const format = (normalizeParam(searchParams.get("format")) ?? "json").toLowerCase();

  const where = buildDbWhere(config, filterField, filterValue) ?? undefined;
  const orderBy =
    buildDbOrderBy(config, sortField, sortDir) ??
    ({ [config.defaultSort.key]: config.defaultSort.dir } as Record<string, "asc" | "desc">);

  const model = (prisma as Record<string, { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }>)[
    config.model
  ];

  const rows = await model.findMany({
    where,
    orderBy,
    select: buildDbSelect(config),
  });

  if (format === "csv") {
    const csv = createCsv(rows, config.columns);
    const response = new NextResponse(csv);
    response.headers.set("Content-Type", "text/csv; charset=utf-8");
    response.headers.set("Content-Disposition", `attachment; filename="${createFilename(config.key, "csv")}"`);
    return response;
  }

  const json = JSON.stringify(rows, null, 2);
  const response = new NextResponse(json);
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  response.headers.set("Content-Disposition", `attachment; filename="${createFilename(config.key, "json")}"`);
  return response;
}

function createFilename(tableKey: string, ext: "json" | "csv") {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `festival-db-${tableKey}-${stamp}.${ext}`;
}

function createCsv(rows: Record<string, unknown>[], columns: DbColumn[]) {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((column) =>
        escapeCsv(formatCsvValue(row[column.key], column.type)),
      )
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function formatCsvValue(value: unknown, type: DbColumnType) {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (type === "json") {
    return JSON.stringify(value);
  }
  if (type === "boolean") {
    return value ? "true" : "false";
  }
  if (type === "number") {
    return Number.isFinite(value as number) ? String(value) : "";
  }
  return String(value);
}

function escapeCsv(value: string) {
  const needsEscaping = /[",\n]/.test(value);
  if (!needsEscaping) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
