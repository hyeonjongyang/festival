import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateNicknameSuggestions } from "@/lib/nickname/generator";
import {
  NicknameLockedError,
  StudentAccessError,
} from "@/lib/students/errors";

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;
export const MAX_NICKNAME_SUGGESTIONS = 5;

const NICKNAME_ALLOWED_REGEX = /^[\p{L}\p{N} ]+$/u;

export type NicknameUpdateResult = {
  nickname: string;
  nicknameLocked: boolean;
};

export type NicknameUpdateParams = {
  userId: string;
  nickname: string;
  lock?: boolean;
};

export function normalizeNickname(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export const nicknameSchema = z
  .string({ message: "닉네임은 문자열이어야 합니다." })
  .transform(normalizeNickname)
  .refine((value) => value.length > 0, {
    message: "닉네임을 입력해주세요.",
  })
  .refine((value) => value.length >= NICKNAME_MIN_LENGTH, {
    message: `닉네임은 최소 ${NICKNAME_MIN_LENGTH}자 이상 입력해주세요.`,
  })
  .refine((value) => value.length <= NICKNAME_MAX_LENGTH, {
    message: `닉네임은 최대 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  })
  .refine((value) => NICKNAME_ALLOWED_REGEX.test(value), {
    message: "닉네임은 한글, 영문, 숫자, 공백만 사용할 수 있습니다.",
  });

export function getNicknameSuggestions(count = 3) {
  const base = Number.isFinite(count) ? count : 3;
  const safeCount = Math.min(
    Math.max(Math.floor(base), 1),
    MAX_NICKNAME_SUGGESTIONS,
  );
  return generateNicknameSuggestions(safeCount);
}

export async function updateStudentNickname(
  params: NicknameUpdateParams,
): Promise<NicknameUpdateResult> {
  const parsed = nicknameSchema.safeParse(params.nickname);

  if (!parsed.success) {
    throw parsed.error;
  }

  const student = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, nicknameLocked: true },
  });

  if (!student || student.role !== "STUDENT") {
    throw new StudentAccessError();
  }

  if (student.nicknameLocked) {
    throw new NicknameLockedError();
  }

  const updated = await prisma.user.update({
    where: { id: student.id },
    data: {
      nickname: parsed.data,
      nicknameLocked: params.lock ? true : student.nicknameLocked,
    },
    select: {
      nickname: true,
      nicknameLocked: true,
    },
  });

  return updated;
}
