#!/usr/bin/env node

import { PrismaClient, UserRole } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const prisma = new PrismaClient();

const SAMPLE_BOOTHS = [
  {
    managerCode: "TEST-BOOTH-01",
    name: "테스트 달고나 연구소",
    location: "운동장 A-1",
    ownerNickname: "달고나 운영팀",
    visitTarget: 34,
  },
  {
    managerCode: "TEST-BOOTH-02",
    name: "스페이스 라면 포차",
    location: "본관 2층 복도",
    ownerNickname: "라면 운영팀",
    visitTarget: 27,
  },
  {
    managerCode: "TEST-BOOTH-03",
    name: "레트로 게임 존",
    location: "체육관 무대 옆",
    ownerNickname: "게임 운영팀",
    visitTarget: 21,
  },
  {
    managerCode: "TEST-BOOTH-04",
    name: "필름 카페",
    location: "과학관 1층",
    ownerNickname: "카페 운영팀",
    visitTarget: 16,
  },
  {
    managerCode: "TEST-BOOTH-05",
    name: "무드 캔들 공방",
    location: "미술실 3",
    ownerNickname: "캔들 운영팀",
    visitTarget: 12,
  },
];

const SAMPLE_STUDENTS = Array.from({ length: 40 }, (_, index) => {
  const ordinal = index + 1;
  return {
    code: `TEST-STU-${String(ordinal).padStart(3, "0")}`,
    grade: (index % 2) + 1,
    classNumber: (index % 5) + 1,
    studentNumber: (index % 25) + 1,
  };
});

function formatStudentId({ grade, classNumber, studentNumber }) {
  return `${grade}${String(classNumber).padStart(2, "0")}${String(studentNumber).padStart(2, "0")}`;
}

async function ensureStudents() {
  const records = [];

  for (const student of SAMPLE_STUDENTS) {
    const normalizedNumber = studentNumberSafe(student.studentNumber);
    const studentId = formatStudentId({
      grade: student.grade,
      classNumber: student.classNumber,
      studentNumber: normalizedNumber,
    });

    const record = await prisma.user.upsert({
      where: { code: student.code },
      update: {
        nickname: studentId,
        role: UserRole.STUDENT,
        grade: student.grade,
        classNumber: student.classNumber,
        studentNumber: normalizedNumber,
        visitCount: 0,
      },
      create: {
        code: student.code,
        nickname: studentId,
        role: UserRole.STUDENT,
        grade: student.grade,
        classNumber: student.classNumber,
        studentNumber: normalizedNumber,
        visitCount: 0,
      },
    });

    records.push(record);
  }

  return records;
}

async function ensureBooths() {
  const records = [];

  for (const booth of SAMPLE_BOOTHS) {
    const owner = await prisma.user.upsert({
      where: { code: booth.managerCode },
      update: {
        nickname: booth.ownerNickname,
        role: UserRole.BOOTH_MANAGER,
      },
      create: {
        code: booth.managerCode,
        nickname: booth.ownerNickname,
        role: UserRole.BOOTH_MANAGER,
      },
    });

    const boothRecord = await prisma.booth.upsert({
      where: { ownerId: owner.id },
      update: {
        name: booth.name,
        location: booth.location,
      },
      create: {
        name: booth.name,
        location: booth.location,
        ownerId: owner.id,
      },
    });

    records.push({
      ...boothRecord,
      visitTarget: booth.visitTarget,
    });
  }

  return records;
}

async function resetVisits(students, booths) {
  const boothIds = booths.map((booth) => booth.id);
  const studentIds = students.map((student) => student.id);

  if (boothIds.length > 0) {
    await prisma.boothVisit.deleteMany({
      where: {
        boothId: { in: boothIds },
      },
    });
    await prisma.visitViolation.deleteMany({
      where: {
        boothId: { in: boothIds },
      },
    });
  }

  if (studentIds.length > 0) {
    await prisma.boothVisit.deleteMany({
      where: {
        studentId: { in: studentIds },
      },
    });
    await prisma.visitViolation.deleteMany({
      where: {
        studentId: { in: studentIds },
      },
    });
    await prisma.user.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        visitCount: 0,
      },
    });
  }
}

async function createVisits(students, booths) {
  if (students.length === 0 || booths.length === 0) {
    return { visitTotal: 0 };
  }

  const randomizedStudents = [...students].sort(() => Math.random() - 0.5);
  const visitsPayload = [];
  const visitCountByStudent = new Map();

  booths.forEach((booth, boothIndex) => {
    const offset = boothIndex * 3;
    const rotated = rotate(randomizedStudents, offset);
    const visitors = rotated.slice(
      0,
      Math.min(booth.visitTarget, randomizedStudents.length),
    );

    visitors.forEach((student, order) => {
      visitsPayload.push({
        boothId: booth.id,
        studentId: student.id,
        visitedAt: new Date(Date.now() - (boothIndex * 45 + order) * 60 * 1000),
      });
      visitCountByStudent.set(
        student.id,
        (visitCountByStudent.get(student.id) ?? 0) + 1,
      );
    });
  });

  if (visitsPayload.length > 0) {
    await prisma.boothVisit.createMany({
      data: visitsPayload,
    });
  }

  for (const [studentId, count] of visitCountByStudent.entries()) {
    await prisma.user.update({
      where: { id: studentId },
      data: {
        visitCount: count,
      },
    });
  }

  return { visitTotal: visitsPayload.length };
}

function rotate(list, offset) {
  if (list.length === 0) {
    return list;
  }
  const normalizedOffset = ((offset % list.length) + list.length) % list.length;
  return list.slice(normalizedOffset).concat(list.slice(0, normalizedOffset));
}

function studentNumberSafe(value) {
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

async function main() {
  console.log("[seed] Creating sample students and booths for leaderboard...");
  const students = await ensureStudents();
  const booths = await ensureBooths();

  await resetVisits(students, booths);
  const { visitTotal } = await createVisits(students, booths);

  console.log(
    `[seed] Ready! ${booths.length} booths, ${students.length} students, ${visitTotal} visits prepared.`,
  );
}

main()
  .catch((error) => {
    console.error("[seed] Failed to create sample data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
