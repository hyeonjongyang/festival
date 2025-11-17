import type { UserRole } from "@prisma/client";
import { describeStudentId } from "@/lib/students/student-id";
import type { StudentNumberParams } from "@/lib/students/student-id";

type UserDisplaySource = StudentNumberParams & {
  role: UserRole;
  nickname: string | null;
};

export function getUserDisplayName(source: UserDisplaySource): string {
  if (source.role === "STUDENT") {
    return describeStudentId(source);
  }

  const trimmed = source.nickname?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "이름 없는 사용자";
}
