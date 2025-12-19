"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { DB_TABLES, coerceDateFields, findDbTableConfig, type DbTableKey } from "@/lib/admin/db-config";
import { captureTableSnapshot, type DbSnapshotAction } from "@/lib/admin/db-snapshots";

export type DbActionResult<T = unknown> = {
  ok: boolean;
  message: string;
  payload?: T;
};

const EMPTY_RESULT: DbActionResult = { ok: false, message: "" };

export async function createDbRecord(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const config = resolveConfig(formData);

  if (!config) {
    return { ok: false, message: "테이블을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  const parsed = parseJsonPayload(formData.get("payload"));
  if (!parsed.ok) {
    return parsed;
  }

  try {
    const snapshotError = await captureSnapshot({
      tableKey: config.key,
      action: "create",
      createdBy: user.id,
    });
    if (snapshotError) {
      return snapshotError;
    }

    const model = (prisma as Record<string, { create: (args: unknown) => Promise<unknown> }>)[config.model];
    const data = coerceDateFields(config, parsed.data);
    const created = await model.create({ data });
    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `${config.label} 레코드를 생성했습니다.`,
      payload: created,
    } satisfies DbActionResult<typeof created>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "생성에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

export async function updateDbRecord(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const config = resolveConfig(formData);

  if (!config) {
    return { ok: false, message: "테이블을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  const recordId = getRecordIdentifier(formData, config.idLabel);
  if (!recordId.ok) {
    return recordId;
  }

  const parsed = parseJsonPayload(formData.get("payload"));
  if (!parsed.ok) {
    return parsed;
  }

  try {
    const snapshotError = await captureSnapshot({
      tableKey: config.key,
      action: "update",
      createdBy: user.id,
      note: `${config.idLabel}: ${recordId.value}`,
    });
    if (snapshotError) {
      return snapshotError;
    }

    const model = (prisma as Record<string, { update: (args: unknown) => Promise<unknown> }>)[config.model];
    const data = coerceDateFields(config, parsed.data);
    const updated = await model.update({
      where: { [config.idField]: recordId.value },
      data,
    });
    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `${config.label} 레코드를 수정했습니다.`,
      payload: updated,
    } satisfies DbActionResult<typeof updated>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "수정에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

export async function deleteDbRecord(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const config = resolveConfig(formData);

  if (!config) {
    return { ok: false, message: "테이블을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  const recordId = getRecordIdentifier(formData, config.idLabel);
  if (!recordId.ok) {
    return recordId;
  }

  try {
    const snapshotError = await captureSnapshot({
      tableKey: config.key,
      action: "delete",
      createdBy: user.id,
      note: `${config.idLabel}: ${recordId.value}`,
    });
    if (snapshotError) {
      return snapshotError;
    }

    const model = (prisma as Record<string, { delete: (args: unknown) => Promise<unknown> }>)[config.model];
    await model.delete({ where: { [config.idField]: recordId.value } });
    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `${config.label} 레코드를 삭제했습니다.`,
    } satisfies DbActionResult<never>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "삭제에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

export async function bulkDeleteTable(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const config = resolveConfig(formData);

  if (!config) {
    return { ok: false, message: "테이블을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  const confirmValue = String(formData.get("confirm") ?? "").trim();
  const expected = config.key.toUpperCase();

  if (confirmValue !== expected) {
    return {
      ok: false,
      message: `확인 문구가 일치하지 않습니다. (필요: ${expected})`,
    } satisfies DbActionResult<never>;
  }

  try {
    const snapshotError = await captureSnapshot({
      tableKey: config.key,
      action: "bulk-delete",
      createdBy: user.id,
      note: "테이블 전체 삭제 전",
    });
    if (snapshotError) {
      return snapshotError;
    }

    const model = (prisma as Record<string, { deleteMany: (args?: unknown) => Promise<{ count: number }> }>)[
      config.model
    ];
    const result = await model.deleteMany();
    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `${config.label} ${result.count}건을 삭제했습니다.`,
    } satisfies DbActionResult<never>;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "삭제에 실패했습니다. 다른 테이블 참조를 확인해주세요.",
    } satisfies DbActionResult<never>;
  }
}

export async function resetDatabase(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const confirmValue = String(formData.get("confirm") ?? "").trim();
  const expected = "RESET-ALL";

  if (confirmValue !== expected) {
    return {
      ok: false,
      message: `확인 문구가 일치하지 않습니다. (필요: ${expected})`,
    } satisfies DbActionResult<never>;
  }

  try {
    const snapshotError = await captureAllSnapshots(user.id);
    if (snapshotError) {
      return snapshotError;
    }

    const results = await prisma.$transaction([
      prisma.boothVisit.deleteMany(),
      prisma.boothRating.deleteMany(),
      prisma.visitViolation.deleteMany(),
      prisma.post.deleteMany(),
      prisma.accountBatch.deleteMany(),
      prisma.booth.deleteMany(),
      prisma.user.deleteMany(),
      prisma.featureFlag.deleteMany(),
    ]);

    const deletedCount = results.reduce((sum, result) => sum + result.count, 0);
    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `전체 데이터 ${deletedCount}건을 초기화했습니다.`,
    } satisfies DbActionResult<never>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "초기화에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

export async function restoreDbSnapshot(_: DbActionResult, formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const snapshotId = String(formData.get("snapshotId") ?? "").trim();
  const tableKey = String(formData.get("table") ?? "").trim();

  if (!snapshotId) {
    return { ok: false, message: "스냅샷을 선택해주세요." } satisfies DbActionResult<never>;
  }

  const snapshot = await prisma.adminDbSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) {
    return { ok: false, message: "스냅샷을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  if (snapshot.tableKey !== tableKey) {
    return { ok: false, message: "테이블 정보가 일치하지 않습니다." } satisfies DbActionResult<never>;
  }

  const config = findDbTableConfig(snapshot.tableKey);
  if (!config) {
    return { ok: false, message: "테이블을 찾지 못했습니다." } satisfies DbActionResult<never>;
  }

  if (!Array.isArray(snapshot.data)) {
    return { ok: false, message: "스냅샷 데이터가 올바르지 않습니다." } satisfies DbActionResult<never>;
  }

  try {
    const snapshotError = await captureSnapshot({
      tableKey: config.key,
      action: "restore",
      createdBy: user.id,
      note: `복구 전 스냅샷 (${snapshot.id})`,
    });
    if (snapshotError) {
      return snapshotError;
    }

    const model = (prisma as Record<string, { deleteMany: () => Promise<unknown>; createMany: (args: unknown) => Promise<unknown> }>)[
      config.model
    ];

    const rows = snapshot.data.map((row) => coerceDateFields(config, { ...(row as Record<string, unknown>) }));

    await prisma.$transaction(async (tx) => {
      const txModel = (tx as typeof prisma)[config.model as keyof typeof prisma] as typeof model;
      await clearDependentRowsForRestore(tx, config.key);
      await txModel.deleteMany();
      if (rows.length > 0) {
        await txModel.createMany({ data: rows });
      }
    });

    revalidatePath("/admin/db");
    return {
      ok: true,
      message: `${config.label} 테이블을 스냅샷으로 복구했습니다.`,
    } satisfies DbActionResult<never>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "복구에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

async function clearDependentRowsForRestore(tx: Prisma.TransactionClient, tableKey: DbTableKey) {
  // Clear referencing tables first so the target table can be replaced without FK violations.
  switch (tableKey) {
    case "users":
      await tx.boothVisit.deleteMany();
      await tx.boothRating.deleteMany();
      await tx.visitViolation.deleteMany();
      await tx.post.deleteMany();
      await tx.accountBatch.deleteMany();
      await tx.booth.deleteMany();
      return;
    case "booths":
      await tx.boothVisit.deleteMany();
      await tx.boothRating.deleteMany();
      await tx.visitViolation.deleteMany();
      await tx.post.deleteMany();
      return;
    default:
      return;
  }
}

function resolveConfig(formData: FormData) {
  const raw = formData.get("table");
  if (typeof raw !== "string") {
    return null;
  }
  return findDbTableConfig(raw);
}

function parseJsonPayload(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, message: "JSON 입력을 채워주세요." } satisfies DbActionResult<never>;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        message: "JSON 객체 형식만 허용됩니다.",
      } satisfies DbActionResult<never>;
    }
    return { ok: true, message: "", data: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "JSON 파싱에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

function getRecordIdentifier(formData: FormData, label: string): DbActionResult & { value?: string } {
  const raw = formData.get("recordId");
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    return {
      ok: false,
      message: `${label}를 입력해주세요.`,
    };
  }
  return { ok: true, message: "", value };
}

export const dbActionInitialState = EMPTY_RESULT;

async function captureSnapshot({
  tableKey,
  action,
  createdBy,
  note,
}: {
  tableKey: DbTableKey;
  action: DbSnapshotAction;
  createdBy?: string | null;
  note?: string | null;
}): Promise<DbActionResult | null> {
  try {
    await captureTableSnapshot({
      tableKey,
      action,
      createdBy,
      note,
    });
    return null;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "스냅샷 저장에 실패했습니다.",
    } satisfies DbActionResult<never>;
  }
}

async function captureAllSnapshots(createdBy: string) {
  for (const table of DB_TABLES) {
    const snapshotError = await captureSnapshot({
      tableKey: table.key,
      action: "reset",
      createdBy,
      note: "전체 초기화 전",
    });
    if (snapshotError) {
      return snapshotError;
    }
  }
  return null;
}
