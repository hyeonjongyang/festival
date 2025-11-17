import type { Prisma } from "@prisma/client";
import { describeStudentId } from "@/lib/students/student-id";

export const boothVisitLogSelect = {
  id: true,
  visitedAt: true,
  booth: {
    select: {
      id: true,
      name: true,
    },
  },
  student: {
    select: {
      id: true,
      nickname: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
    },
  },
} as const satisfies Prisma.BoothVisitSelect;

export type BoothVisitLogRecord = Prisma.BoothVisitGetPayload<{
  select: typeof boothVisitLogSelect;
}>;

export type BoothVisitLogItem = {
  id: string;
  visitedAt: string;
  boothId: string;
  boothName: string;
  studentId: string;
  studentIdentifier: string;
  studentLabel: string;
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
};

export function formatStudentLabel(params: {
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
}) {
  const segments: string[] = [];

  if (typeof params.grade === "number") {
    segments.push(`${params.grade}학년`);
  }

  if (typeof params.classNumber === "number") {
    segments.push(`${params.classNumber}반`);
  }

  if (typeof params.studentNumber === "number") {
    segments.push(`${params.studentNumber}번`);
  }

  return segments.length > 0 ? segments.join(" ") : "학년 정보 없음";
}

function formatBoothName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "이름 없는 부스";
}

export function mapBoothVisitLog(record: BoothVisitLogRecord): BoothVisitLogItem {
  return {
    id: record.id,
    visitedAt: record.visitedAt.toISOString(),
    boothId: record.booth.id,
    boothName: formatBoothName(record.booth?.name),
    studentId: record.student.id,
    studentIdentifier: describeStudentId(record.student),
    studentLabel: formatStudentLabel(record.student),
    grade: record.student.grade ?? null,
    classNumber: record.student.classNumber ?? null,
    studentNumber: record.student.studentNumber ?? null,
  };
}

export function mapBoothVisitLogs(records: BoothVisitLogRecord[]) {
  return records.map(mapBoothVisitLog);
}
