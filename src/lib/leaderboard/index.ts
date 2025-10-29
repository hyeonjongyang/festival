import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatStudentLabel } from "@/lib/points/logs";

export const LEADERBOARD_GRADES = [1, 2] as const;

export type LeaderboardGrade = (typeof LEADERBOARD_GRADES)[number];
export type LeaderboardGradeFilter = LeaderboardGrade | "all";

export type LeaderboardEntry = {
  id: string;
  rank: number;
  nickname: string;
  points: number;
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
  profileLabel: string;
};

export type LeaderboardResult = {
  grade: LeaderboardGradeFilter;
  generatedAt: string;
  totalStudents: number;
  entries: LeaderboardEntry[];
};

export type FetchLeaderboardOptions = {
  grade?: LeaderboardGradeFilter | number | string | null | undefined;
};

const leaderboardSelect = {
  id: true,
  nickname: true,
  points: true,
  grade: true,
  classNumber: true,
  studentNumber: true,
} as const satisfies Prisma.UserSelect;

export type LeaderboardRecord = Prisma.UserGetPayload<{
  select: typeof leaderboardSelect;
}>;

const collator = new Intl.Collator("ko", {
  sensitivity: "base",
  usage: "sort",
});

export function normalizeLeaderboardGrade(
  value: FetchLeaderboardOptions["grade"],
): LeaderboardGradeFilter {
  if (typeof value === "number" && Number.isFinite(value)) {
    return LEADERBOARD_GRADES.includes(value as LeaderboardGrade)
      ? (value as LeaderboardGrade)
      : "all";
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed || trimmed === "all") {
      return "all";
    }

    const parsed = Number(trimmed);

    if (Number.isFinite(parsed) && LEADERBOARD_GRADES.includes(parsed as LeaderboardGrade)) {
      return parsed as LeaderboardGrade;
    }
  }

  return "all";
}

export function sortLeaderboardRecords(records: LeaderboardRecord[]) {
  return [...records].sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    return collator.compare(a.nickname, b.nickname);
  });
}

export function rankLeaderboardRecords(
  records: LeaderboardRecord[],
): LeaderboardEntry[] {
  const sorted = sortLeaderboardRecords(records);

  let currentRank = 0;
  let previousPoints: number | null = null;

  return sorted.map((record) => {
    if (previousPoints === null || record.points !== previousPoints) {
      currentRank += 1;
      previousPoints = record.points;
    }

    return {
      id: record.id,
      rank: currentRank,
      nickname: record.nickname,
      points: record.points,
      grade: record.grade ?? null,
      classNumber: record.classNumber ?? null,
      studentNumber: record.studentNumber ?? null,
      profileLabel: formatStudentLabel(record),
    };
  });
}

export async function fetchLeaderboard(
  options: FetchLeaderboardOptions = {},
): Promise<LeaderboardResult> {
  const grade = normalizeLeaderboardGrade(options.grade);
  const where: Prisma.UserWhereInput = { role: "STUDENT" };

  if (grade !== "all") {
    where.grade = grade;
  }

  const records = await prisma.user.findMany({
    where,
    orderBy: [
      { points: "desc" },
      { nickname: "asc" },
    ],
    select: leaderboardSelect,
  });

  const entries = rankLeaderboardRecords(records);

  return {
    grade,
    generatedAt: new Date().toISOString(),
    totalStudents: entries.length,
    entries,
  };
}
