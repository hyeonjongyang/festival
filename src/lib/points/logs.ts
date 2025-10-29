import type { Prisma } from "@prisma/client";

export const boothPointLogSelect = {
  id: true,
  points: true,
  awardedAt: true,
  student: {
    select: {
      id: true,
      nickname: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
    },
  },
} as const satisfies Prisma.PointLogSelect;

export type BoothPointLogRecord = Prisma.PointLogGetPayload<{
  select: typeof boothPointLogSelect;
}>;

export type BoothPointLogItem = {
  id: string;
  points: number;
  awardedAt: string;
  studentId: string;
  studentNickname: string;
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

export function mapBoothPointLog(record: BoothPointLogRecord): BoothPointLogItem {
  return {
    id: record.id,
    points: record.points,
    awardedAt: record.awardedAt.toISOString(),
    studentId: record.student.id,
    studentNickname: record.student.nickname,
    studentLabel: formatStudentLabel(record.student),
    grade: record.student.grade ?? null,
    classNumber: record.student.classNumber ?? null,
    studentNumber: record.student.studentNumber ?? null,
  };
}

export function mapBoothPointLogs(records: BoothPointLogRecord[]) {
  return records.map(mapBoothPointLog);
}
