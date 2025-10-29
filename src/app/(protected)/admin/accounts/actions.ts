"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createStudentAccountsBatch } from "@/lib/accounts/student-batch";
import { createAdminAccountsBatch, createBoothAccountsBatch } from "@/lib/accounts/role-batches";
import {
  MAX_ADMIN_BATCH_COUNT,
  MAX_BOOTH_BATCH_COUNT,
} from "@/lib/accounts/batch-constants";
import type {
  AdminBatchActionState,
  BoothBatchActionState,
  StudentBatchActionState,
} from "./state";

const studentSchema = z.object({
  gradeFrom: z
    .coerce.number()
    .int()
    .min(1, "최소 학년은 1학년입니다.")
    .max(3, "최대 학년은 3학년입니다."),
  gradeTo: z
    .coerce.number()
    .int()
    .min(1, "최소 학년은 1학년입니다.")
    .max(3, "최대 학년은 3학년입니다."),
  classCount: z
    .coerce.number()
    .int()
    .min(1, "반 수는 최소 1입니다.")
    .max(30, "반 수는 30반을 초과할 수 없습니다."),
  studentsPerClass: z
    .coerce.number()
    .int()
    .min(1, "학생 수는 최소 1명입니다.")
    .max(40, "한 반당 최대 40명까지 지원합니다."),
  startNumber: z
    .coerce.number()
    .int()
    .min(1, "시작 학번은 1 이상이어야 합니다.")
    .max(99, "시작 학번은 99 이하로 설정해주세요."),
});

const boothSchema = z.object({
  baseName: z
    .string()
    .trim()
    .min(1, "부스 이름을 입력해주세요.")
    .max(40, "부스 이름은 40자 이하로 입력해주세요."),
  count: z
    .coerce.number()
    .int()
    .min(1)
    .max(MAX_BOOTH_BATCH_COUNT),
  location: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  description: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
});

const adminSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "표시 이름을 입력해주세요.")
    .max(40, "표시 이름은 40자 이하로 입력해주세요."),
  count: z
    .coerce.number()
    .int()
    .min(1)
    .max(MAX_ADMIN_BATCH_COUNT),
});

export async function handleStudentBatchAction(
  _prevState: StudentBatchActionState,
  formData: FormData,
): Promise<StudentBatchActionState> {
  const admin = await assertAdmin();
  const parsed = studentSchema.safeParse({
    gradeFrom: formData.get("gradeFrom"),
    gradeTo: formData.get("gradeTo"),
    classCount: formData.get("classCount"),
    studentsPerClass: formData.get("studentsPerClass"),
    startNumber: formData.get("startNumber"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  if (parsed.data.gradeFrom > parsed.data.gradeTo) {
    return {
      status: "error",
      message: "시작 학년은 끝 학년보다 클 수 없습니다.",
    };
  }

  try {
    const result = await createStudentAccountsBatch({
      ...parsed.data,
      creatorId: admin.id,
    });

    return {
      status: "success",
      message: `총 ${result.createdCount}명의 학생 계정을 생성했습니다.`,
      total: result.createdCount,
      downloadUrl: result.downloadPath,
      preview: result.previewAccounts,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleBoothBatchAction(
  _prevState: BoothBatchActionState,
  formData: FormData,
): Promise<BoothBatchActionState> {
  const admin = await assertAdmin();
  const parsed = boothSchema.safeParse({
    baseName: formData.get("baseName"),
    count: formData.get("count"),
    location: formData.get("location"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  try {
    const result = await createBoothAccountsBatch({
      creatorId: admin.id,
      baseName: parsed.data.baseName,
      count: parsed.data.count,
      location: parsed.data.location,
      description: parsed.data.description,
    });

    return {
      status: "success",
      message: `${result.accounts.length}개의 부스 관리자 계정을 생성했습니다.`,
      accounts: result.accounts,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleAdminBatchAction(
  _prevState: AdminBatchActionState,
  formData: FormData,
): Promise<AdminBatchActionState> {
  const admin = await assertAdmin();
  const parsed = adminSchema.safeParse({
    label: formData.get("label"),
    count: formData.get("count"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  try {
    const result = await createAdminAccountsBatch({
      creatorId: admin.id,
      label: parsed.data.label,
      count: parsed.data.count,
    });

    return {
      status: "success",
      message: `${result.accounts.length}개의 전체 관리자 계정을 생성했습니다.`,
      accounts: result.accounts,
    };
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  console.error(error);
  return {
    status: "error" as const,
    message:
      error instanceof Error
        ? error.message
        : "요청을 처리하는 중 문제가 발생했습니다.",
  };
}

async function assertAdmin() {
  const user = await getSessionUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("권한이 없습니다. 다시 로그인해주세요.");
  }

  return user;
}
