"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createStudentAccountsBatch } from "@/lib/accounts/student-batch";
import {
  createAdminAccountsBatch,
  createBoothAccountsBatch,
} from "@/lib/accounts/role-batches";
import { setBoothRegistrationOpen } from "@/lib/features/booth-registration";

export type ActionResult<T = unknown> = {
  ok: boolean;
  message: string;
  payload?: T;
};

export async function submitStudentBatch(_: ActionResult, formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const gradeFrom = Number(formData.get("gradeFrom"));
  const gradeTo = Number(formData.get("gradeTo"));
  const classCount = Number(formData.get("classCount"));
  const studentsPerClass = Number(formData.get("studentsPerClass"));
  const startNumber = Number(formData.get("startNumber"));

  if ([gradeFrom, gradeTo, classCount, studentsPerClass, startNumber].some((value) => !Number.isFinite(value))) {
    return { ok: false, message: "모든 숫자 입력을 확인해주세요." } satisfies ActionResult<never>;
  }

  try {
    const result = await createStudentAccountsBatch({
      creatorId: session.id,
      gradeFrom,
      gradeTo,
      classCount,
      studentsPerClass,
      startNumber,
    });

    revalidatePath("/admin/accounts");

    return {
      ok: true,
      message: `학생 ${result.createdCount}명 생성 완료`,
      payload: result,
    } satisfies ActionResult<typeof result>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "학생 계정을 생성하지 못했습니다.",
    } satisfies ActionResult<never>;
  }
}

export async function submitBoothBatch(_: ActionResult, formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const baseName = String(formData.get("baseName") ?? "");
  const count = Number(formData.get("count"));
  const location = formData.get("location");
  const description = formData.get("description");

  if (!Number.isFinite(count)) {
    return { ok: false, message: "생성 개수를 확인해주세요." } satisfies ActionResult<never>;
  }

  try {
    const result = await createBoothAccountsBatch({
      creatorId: session.id,
      baseName,
      count,
      location: typeof location === "string" ? location : undefined,
      description: typeof description === "string" ? description : undefined,
    });

    revalidatePath("/admin/accounts");

    return {
      ok: true,
      message: `부스 관리자 ${result.accounts.length}명 생성 완료`,
      payload: result,
    } satisfies ActionResult<typeof result>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "부스 계정을 생성하지 못했습니다.",
    } satisfies ActionResult<never>;
  }
}

export async function submitAdminBatch(_: ActionResult, formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const label = String(formData.get("label") ?? "");
  const count = Number(formData.get("count"));

  if (!Number.isFinite(count)) {
    return { ok: false, message: "생성 개수를 확인해주세요." } satisfies ActionResult<never>;
  }

  try {
    const result = await createAdminAccountsBatch({
      creatorId: session.id,
      label,
      count,
    });

    revalidatePath("/admin/accounts");

    return {
      ok: true,
      message: `관리자 ${result.accounts.length}명 생성 완료`,
      payload: result,
    } satisfies ActionResult<typeof result>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "관리자 계정을 생성하지 못했습니다.",
    } satisfies ActionResult<never>;
  }
}

export async function toggleRegistrationAction(_: ActionResult, formData: FormData) {
  await requireRole(["ADMIN"]);
  const enabledValue = formData.get("enabled");
  const enabled = enabledValue === "true";

  try {
    await setBoothRegistrationOpen(enabled);
    revalidatePath("/admin/accounts");
    return {
      ok: true,
      message: enabled ? "부스 접수를 열었습니다." : "부스 접수를 닫았습니다.",
    } satisfies ActionResult<never>;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "설정을 변경하지 못했습니다.",
    } satisfies ActionResult<never>;
  }
}
