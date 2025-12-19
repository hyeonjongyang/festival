import type { DbTableKey } from "@/lib/admin/db-config";
import { buildDbSelect, findDbTableConfig } from "@/lib/admin/db-config";
import { prisma } from "@/lib/prisma";

export type DbSnapshotAction =
  | "create"
  | "update"
  | "delete"
  | "bulk-delete"
  | "reset"
  | "spreadsheet"
  | "restore";

type SnapshotParams = {
  tableKey: DbTableKey;
  action: DbSnapshotAction;
  createdBy?: string | null;
  note?: string | null;
};

export async function captureTableSnapshot({ tableKey, action, createdBy, note }: SnapshotParams) {
  const config = findDbTableConfig(tableKey);
  if (!config) {
    throw new Error("테이블이 올바르지 않습니다.");
  }

  const model = (prisma as unknown as Record<
    string,
    { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }
  >)[config.model];
  const rows = await model.findMany({ select: buildDbSelect(config) });
  const data = JSON.parse(JSON.stringify(rows));
  const trimmedNote = note?.trim();

  return prisma.adminDbSnapshot.create({
    data: {
      tableKey: config.key,
      action,
      note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : null,
      createdBy: createdBy ?? null,
      recordCount: rows.length,
      data,
    },
  });
}
