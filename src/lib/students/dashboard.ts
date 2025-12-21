import { prisma } from "@/lib/prisma";
import { StudentAccessError } from "@/lib/students/errors";
import { formatStudentId } from "@/lib/students/student-id";

export const RECENT_VISIT_LOG_LIMIT = 10;

export type StudentVisitLogItem = {
  id: string;
  boothId: string | null;
  boothName: string;
  visitedAt: string;
  rating: number | null;
};

export type StudentDashboardData = {
  id: string;
  studentId: string | null;
  nickname: string;
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
  visitCount: number;
  recentVisits: StudentVisitLogItem[];
};

type VisitLogRecord = {
  id: string;
  visitedAt: Date;
  booth: {
    id: string;
    name: string | null;
    ratings: {
      score: number;
    }[];
  } | null;
};

export function mapVisitLogs(records: VisitLogRecord[]): StudentVisitLogItem[] {
  return records.map((record) => ({
    id: record.id,
    boothId: record.booth?.id ?? null,
    boothName: formatBoothName(record.booth?.name),
    visitedAt: record.visitedAt.toISOString(),
    rating: record.booth?.ratings?.[0]?.score ?? null,
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
      grade: true,
      classNumber: true,
      studentNumber: true,
      visitCount: true,
    },
  });

  if (!student || student.role !== "STUDENT") {
    throw new StudentAccessError();
  }

  const recentVisits = await prisma.boothVisit.findMany({
    where: { studentId: student.id },
    orderBy: { visitedAt: "desc" },
    take: RECENT_VISIT_LOG_LIMIT,
    select: {
      id: true,
      visitedAt: true,
      booth: {
        select: {
          id: true,
          name: true,
          ratings: {
            where: { studentId: student.id },
            select: {
              score: true,
            },
          },
        },
      },
    },
  });

  return {
    id: student.id,
    studentId: formatStudentId(student),
    nickname: student.nickname,
    grade: student.grade ?? null,
    classNumber: student.classNumber ?? null,
    studentNumber: student.studentNumber ?? null,
    visitCount: student.visitCount,
    recentVisits: mapVisitLogs(recentVisits),
  };
}
