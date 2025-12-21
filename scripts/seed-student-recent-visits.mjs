#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) return null;
  const raw = databaseUrl.slice("file:".length);
  if (!raw.startsWith("./") && !raw.startsWith("../")) return null;
  return path.resolve(process.cwd(), raw);
}

function toAbsoluteSqliteUrl(databaseUrl) {
  const resolved = resolveSqlitePath(databaseUrl);
  if (!resolved) return databaseUrl;
  return `file:${resolved}`;
}

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = toAbsoluteSqliteUrl(DEFAULT_DATABASE_URL);
    return;
  }

  const resolved = resolveSqlitePath(process.env.DATABASE_URL);
  if (!resolved) return;

  if (fs.existsSync(resolved)) {
    process.env.DATABASE_URL = toAbsoluteSqliteUrl(process.env.DATABASE_URL);
    return;
  }

  const fallbackResolved = resolveSqlitePath(DEFAULT_DATABASE_URL);
  if (fallbackResolved && fs.existsSync(fallbackResolved)) {
    process.env.DATABASE_URL = toAbsoluteSqliteUrl(DEFAULT_DATABASE_URL);
    return;
  }

  process.env.DATABASE_URL = toAbsoluteSqliteUrl(process.env.DATABASE_URL);
}

function parseArgs(argv) {
  const [studentId, countRaw] = argv.slice(2);
  const count = Number.parseInt(countRaw ?? "8", 10);

  if (!studentId) {
    throw new Error("Usage: node scripts/seed-student-recent-visits.mjs <studentUserId> [count]");
  }

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }

  return { studentId, count: Math.min(count, 25) };
}

const BOOTH_NAME_PREFIXES = [
  "별빛",
  "레트로",
  "캠퍼스",
  "네온",
  "종이비행기",
  "달고나",
  "오로라",
  "풍선껌",
  "코스믹",
  "모래시계",
];

const BOOTH_NAME_SUFFIXES = [
  "연구소",
  "공방",
  "포차",
  "라운지",
  "게임존",
  "스튜디오",
  "카페",
  "부스",
  "마켓",
  "부엌",
];

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function uniqueCode(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
}

async function ensureStudent(prisma, studentId) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
      nickname: true,
    },
  });

  if (student) {
    if (student.role !== UserRole.STUDENT) {
      throw new Error(`User ${studentId} exists but is not a STUDENT.`);
    }

    return student;
  }

  return prisma.user.create({
    data: {
      id: studentId,
      role: UserRole.STUDENT,
      code: uniqueCode("TEST-STU"),
      nickname: "테스트학생",
      grade: 2,
      classNumber: 1,
      studentNumber: 1,
      visitCount: 0,
    },
    select: {
      id: true,
      role: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
      nickname: true,
    },
  });
}

async function ensureBooths(prisma, count) {
  const booths = await prisma.booth.findMany({
    take: count,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (booths.length >= count) return booths;

  const created = [...booths];
  const needed = count - booths.length;

  for (let index = 0; index < needed; index += 1) {
    const owner = await prisma.user.create({
      data: {
        role: UserRole.BOOTH_MANAGER,
        code: uniqueCode("TEST-BOOTH"),
        nickname: `테스트 운영팀 ${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      },
      select: { id: true },
    });

    const booth = await prisma.booth.create({
      data: {
        ownerId: owner.id,
        name: `${pick(BOOTH_NAME_PREFIXES)} ${pick(BOOTH_NAME_SUFFIXES)}`,
        location: `테스트 구역 ${index + 1}`,
      },
      select: { id: true },
    });

    created.push(booth);
  }

  return created;
}

async function createBooth(prisma, indexLabel) {
  const owner = await prisma.user.create({
    data: {
      role: UserRole.BOOTH_MANAGER,
      code: uniqueCode("TEST-BOOTH"),
      nickname: `테스트 운영팀 ${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    },
    select: { id: true },
  });

  return prisma.booth.create({
    data: {
      ownerId: owner.id,
      name: `${pick(BOOTH_NAME_PREFIXES)} ${pick(BOOTH_NAME_SUFFIXES)}`,
      location: `테스트 구역 ${indexLabel}`,
    },
    select: { id: true },
  });
}

async function seedRecentVisits(prisma, studentId, count) {
  const alreadyVisited = await prisma.boothVisit.findMany({
    where: { studentId },
    select: { boothId: true },
  });

  const visitedBoothIds = new Set(alreadyVisited.map((visit) => visit.boothId));
  await ensureBooths(prisma, Math.max(count, 6));

  const unvisited = await prisma.booth.findMany({
    where: { id: { notIn: [...visitedBoothIds] } },
    take: count,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const targets = unvisited.map((booth) => booth.id);
  const missing = count - targets.length;

  for (let index = 0; index < missing; index += 1) {
    const booth = await createBooth(prisma, `추가 ${index + 1}`);
    targets.push(booth.id);
  }

  const now = Date.now();
  const visitsToCreate = targets.map((boothId, index) => ({
    boothId,
    studentId,
    visitedAt: new Date(now - index * 7 * 60 * 1000),
  }));

  await prisma.boothVisit.createMany({ data: visitsToCreate });

  const ratingsTarget = Math.min(3, targets.length);
  for (let index = 0; index < ratingsTarget; index += 1) {
    const boothId = targets[index];
    const score = 3 + (index % 3);
    await prisma.boothRating.upsert({
      where: { boothId_studentId: { boothId, studentId } },
      update: { score },
      create: { boothId, studentId, score },
    });
  }

  const total = await prisma.boothVisit.count({ where: { studentId } });
  await prisma.user.update({
    where: { id: studentId },
    data: { visitCount: total },
  });

  const recent = await prisma.boothVisit.findMany({
    where: { studentId },
    orderBy: { visitedAt: "desc" },
    take: Math.min(count, 10),
    select: {
      visitedAt: true,
      booth: { select: { name: true } },
    },
  });

  return { created: visitsToCreate.length, total, recent };
}

async function main() {
  ensureDatabaseUrl();
  const { studentId, count } = parseArgs(process.argv);
  const prisma = new PrismaClient();

  try {
    const student = await ensureStudent(prisma, studentId);
    const { created, total, recent } = await seedRecentVisits(prisma, studentId, count);

    console.log(
      `[seed] student=${student.id} (grade=${student.grade ?? "?"}, class=${student.classNumber ?? "?"}, num=${student.studentNumber ?? "?"})`,
    );
    console.log(`[seed] created ${created} visits, student now has ${total} total visits.`);
    console.log("[seed] top recent:");
    recent.forEach((entry, index) => {
      console.log(
        `  ${String(index + 1).padStart(2, "0")}. ${entry.booth?.name ?? "이름 없는 부스"} @ ${entry.visitedAt.toISOString()}`,
      );
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exitCode = 1;
});
