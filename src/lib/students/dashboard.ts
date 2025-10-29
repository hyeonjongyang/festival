import { prisma } from "@/lib/prisma";
import { StudentAccessError } from "@/lib/students/errors";

export const RECENT_POINT_LOG_LIMIT = 10;

export type StudentPointLogItem = {
  id: string;
  boothName: string;
  points: number;
  awardedAt: string;
};

export type StudentDashboardData = {
  id: string;
  nickname: string;
  nicknameLocked: boolean;
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
  points: number;
  qrToken: string;
  recentLogs: StudentPointLogItem[];
};

type PointLogRecord = {
  id: string;
  points: number;
  awardedAt: Date;
  booth: {
    name: string | null;
  } | null;
};

export function mapPointLogs(records: PointLogRecord[]): StudentPointLogItem[] {
  return records.map((record) => ({
    id: record.id,
    boothName: formatBoothName(record.booth?.name),
    points: record.points,
    awardedAt: record.awardedAt.toISOString(),
  }));
}

function formatBoothName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "이름 없는 부스";
}

export async function fetchStudentDashboard(
  userId: string,
): Promise<StudentDashboardData> {
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      nickname: true,
      nicknameLocked: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
      points: true,
      qrToken: true,
    },
  });

  if (!student || student.role !== "STUDENT") {
    throw new StudentAccessError();
  }

  const recentLogs = await prisma.pointLog.findMany({
    where: { studentId: student.id },
    orderBy: { awardedAt: "desc" },
    take: RECENT_POINT_LOG_LIMIT,
    select: {
      id: true,
      points: true,
      awardedAt: true,
      booth: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    id: student.id,
    nickname: student.nickname,
    nicknameLocked: student.nicknameLocked,
    grade: student.grade ?? null,
    classNumber: student.classNumber ?? null,
    studentNumber: student.studentNumber ?? null,
    points: student.points,
    qrToken: student.qrToken,
    recentLogs: mapPointLogs(recentLogs),
  };
}
