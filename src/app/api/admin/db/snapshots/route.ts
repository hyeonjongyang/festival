import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { findDbTableConfig } from "@/lib/admin/db-config";
import { captureTableSnapshot, type DbSnapshotAction } from "@/lib/admin/db-snapshots";

type SnapshotPayload = {
  table?: string;
  action?: DbSnapshotAction;
  note?: string;
};

const ALLOWED_ACTIONS = new Set<DbSnapshotAction>([
  "create",
  "update",
  "delete",
  "bulk-delete",
  "reset",
  "spreadsheet",
  "restore",
]);

export async function POST(request: NextRequest) {
  const session = await getSessionUser();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
  }

  let payload: SnapshotPayload;
  try {
    payload = (await request.json()) as SnapshotPayload;
  } catch {
    return NextResponse.json({ message: "요청 본문을 읽지 못했습니다." }, { status: 400 });
  }

  const tableKey = payload.table?.trim();
  if (!tableKey) {
    return NextResponse.json({ message: "테이블 값이 필요합니다." }, { status: 400 });
  }

  const config = findDbTableConfig(tableKey);
  if (!config) {
    return NextResponse.json({ message: "테이블이 올바르지 않습니다." }, { status: 400 });
  }

  const action = payload.action && ALLOWED_ACTIONS.has(payload.action) ? payload.action : "spreadsheet";
  const note = typeof payload.note === "string" ? payload.note.trim() : undefined;

  try {
    const snapshot = await captureTableSnapshot({
      tableKey: config.key,
      action,
      createdBy: session.id,
      note,
    });
    return NextResponse.json({ id: snapshot.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "스냅샷 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
