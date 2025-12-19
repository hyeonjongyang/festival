import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { buildDbSelect, findDbTableConfig, type DbColumn } from "@/lib/admin/db-config";
import { captureTableSnapshot } from "@/lib/admin/db-snapshots";

type UpdatePayload = {
  table?: string;
  recordId?: string;
  field?: string;
  value?: string;
  skipSnapshot?: boolean;
};

export async function PATCH(request: NextRequest) {
  const session = await getSessionUser();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
  }

  let payload: UpdatePayload;
  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ message: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  const tableKey = payload.table?.trim();
  const recordId = payload.recordId?.trim();
  const field = payload.field?.trim();

  if (!tableKey || !recordId || !field) {
    return NextResponse.json({ message: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const config = findDbTableConfig(tableKey);
  if (!config) {
    return NextResponse.json({ message: "테이블이 올바르지 않습니다." }, { status: 400 });
  }

  const column = config.columns.find((item) => item.key === field);
  if (!column) {
    return NextResponse.json({ message: "컬럼이 올바르지 않습니다." }, { status: 400 });
  }

  let parsedValue: unknown;
  try {
    parsedValue = parseCellValue(payload.value ?? "", column);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "값을 처리하지 못했습니다." },
      { status: 400 },
    );
  }

  try {
    if (!payload.skipSnapshot) {
      await captureTableSnapshot({
        tableKey: config.key,
        action: "spreadsheet",
        createdBy: session.id,
        note: `${config.idLabel}: ${recordId}`,
      });
    }

    const model = (prisma as Record<string, { update: (args: unknown) => Promise<Record<string, unknown>> }>)[
      config.model
    ];

    const updated = await model.update({
      where: { [config.idField]: recordId },
      data: { [column.key]: parsedValue },
      select: buildDbSelect(config),
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "업데이트에 실패했습니다." },
      { status: 400 },
    );
  }
}

function parseCellValue(value: string, column: DbColumn) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    if (column.type === "string") {
      return value;
    }
    return null;
  }

  switch (column.type) {
    case "number": {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        throw new Error("숫자 값을 입력해주세요.");
      }
      return numeric;
    }
    case "boolean": {
      if (trimmed !== "true" && trimmed !== "false") {
        throw new Error("true 또는 false로 입력해주세요.");
      }
      return trimmed === "true";
    }
    case "date": {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("날짜 형식이 올바르지 않습니다. ISO 문자열을 사용하세요.");
      }
      return parsed;
    }
    case "json": {
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error("JSON 형식이 올바르지 않습니다.");
      }
    }
    case "enum":
      return trimmed.toUpperCase();
    default:
      return value;
  }
}
