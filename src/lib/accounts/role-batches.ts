import { AccountBatchKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createUniqueCodeFactory } from "@/lib/accounts/code-factory";
import {
  MAX_ADMIN_BATCH_COUNT,
  MAX_BOOTH_BATCH_COUNT,
} from "@/lib/accounts/batch-constants";
import type {
  AdminAccountSummary,
  AdminBatchPayload,
  AdminBatchResult,
  BoothAccountSummary,
  BoothBatchPayload,
  BoothBatchResult,
} from "@/lib/accounts/types";

export type BoothBatchInput = {
  creatorId: string;
  baseName: string;
  count: number;
  location?: string | null;
  description?: string | null;
};

export type AdminBatchInput = {
  creatorId: string;
  label: string;
  count: number;
};

export async function createBoothAccountsBatch(
  input: BoothBatchInput,
): Promise<BoothBatchResult> {
  const trimmedName = input.baseName.trim();

  if (!trimmedName) {
    throw new Error("부스 이름을 입력해주세요.");
  }

  if (input.count < 1 || input.count > MAX_BOOTH_BATCH_COUNT) {
    throw new Error(
      `부스 계정은 1~${MAX_BOOTH_BATCH_COUNT}개까지 한 번에 생성할 수 있습니다.`,
    );
  }

  const sanitizedLocation = sanitizeOptional(input.location);
  const sanitizedDescription = sanitizeOptional(input.description);
  const generateCode = await createUniqueCodeFactory();

  const plan = Array.from({ length: input.count }, (_, index) => {
    const suffix = input.count === 1 ? "" : ` ${String(index + 1).padStart(2, "0")}`;
    const boothName = `${trimmedName}${suffix}`;
    const nickname = `${boothName} 운영팀`;

    return {
      boothName,
      nickname,
      code: generateCode(),
    };
  });

  const { accounts, batchId } = await prisma.$transaction(async (tx) => {
    const created: BoothAccountSummary[] = [];

    for (const entry of plan) {
      const user = await tx.user.create({
        data: {
          role: "BOOTH_MANAGER",
          code: entry.code,
          nickname: entry.nickname,
          nicknameLocked: true,
        },
        select: {
          id: true,
          code: true,
          nickname: true,
        },
      });

      await tx.booth.create({
        data: {
          ownerId: user.id,
          name: entry.boothName,
          location: sanitizedLocation,
          description: sanitizedDescription,
        },
      });

      created.push({
        boothName: entry.boothName,
        code: user.code,
        nickname: user.nickname,
      });
    }

    const payload: BoothBatchPayload = {
      version: 1,
      kind: "booth",
      params: {
        baseName: trimmedName,
        count: input.count,
        location: sanitizedLocation ?? undefined,
        description: sanitizedDescription ?? undefined,
      },
      result: {
        total: created.length,
        booths: created,
      },
    };

    const batch = await tx.accountBatch.create({
      data: {
        createdBy: input.creatorId,
        kind: AccountBatchKind.BOOTH,
        payload,
      },
      select: { id: true },
    });

    return { accounts: created, batchId: batch.id };
  });

  return { batchId, accounts };
}

export async function createAdminAccountsBatch(
  input: AdminBatchInput,
): Promise<AdminBatchResult> {
  const trimmedLabel = input.label.trim() || "전체 관리자";

  if (input.count < 1 || input.count > MAX_ADMIN_BATCH_COUNT) {
    throw new Error(
      `전체 관리자 계정은 1~${MAX_ADMIN_BATCH_COUNT}개까지 한 번에 생성할 수 있습니다.`,
    );
  }

  const generateCode = await createUniqueCodeFactory();

  const plan = Array.from({ length: input.count }, (_, index) => {
    const suffix = input.count === 1 ? "" : ` ${String(index + 1).padStart(2, "0")}`;
    const label = `${trimmedLabel}${suffix}`;
    return {
      label,
      nickname: label,
      code: generateCode(),
    };
  });

  const { accounts, batchId } = await prisma.$transaction(async (tx) => {
    const created: AdminAccountSummary[] = [];

    for (const entry of plan) {
      const user = await tx.user.create({
        data: {
          role: "ADMIN",
          code: entry.code,
          nickname: entry.nickname,
          nicknameLocked: true,
        },
        select: {
          code: true,
          nickname: true,
        },
      });

      created.push({
        label: entry.label,
        code: user.code,
        nickname: user.nickname,
      });
    }

    const payload: AdminBatchPayload = {
      version: 1,
      kind: "admin",
      params: {
        label: trimmedLabel,
        count: input.count,
      },
      result: {
        total: created.length,
        admins: created,
      },
    };

    const batch = await tx.accountBatch.create({
      data: {
        createdBy: input.creatorId,
        kind: AccountBatchKind.ADMIN,
        payload,
      },
      select: { id: true },
    });

    return { accounts: created, batchId: batch.id };
  });

  return { batchId, accounts };
}

function sanitizeOptional(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
