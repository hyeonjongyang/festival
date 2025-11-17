import { promises as fs } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { AccountBatchKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createUniqueCodeFactory } from "@/lib/accounts/code-factory";
import { STUDENT_BATCH_SIZE_LIMIT } from "@/lib/accounts/batch-constants";
import { getBatchDownloadUrl } from "@/lib/accounts/download-url";
import { formatStudentId } from "@/lib/students/student-id";
import type {
  StudentAccountPreview,
  StudentBatchParams,
  StudentBatchPayload,
  StudentBatchResult,
} from "@/lib/accounts/types";

export type StudentBatchInput = StudentBatchParams & {
  creatorId: string;
};

type PlannedStudent = {
  grade: number;
  classNumber: number;
  studentNumber: number;
  code: string;
  studentId: string;
};

type PersistedStudentRow = PlannedStudent;

export type StudentWorksheetRow = Pick<
  PersistedStudentRow,
  "grade" | "classNumber" | "studentNumber" | "code" | "studentId"
>;

export type StudentWorksheetColumn = {
  header: string;
  key: keyof StudentWorksheetRow;
  width: number;
};

export const STUDENT_WORKSHEET_COLUMNS: StudentWorksheetColumn[] = [
  { header: "학년", key: "grade", width: 8 },
  { header: "반", key: "classNumber", width: 8 },
  { header: "번호", key: "studentNumber", width: 8 },
  { header: "로그인 코드", key: "code", width: 15 },
  { header: "학번", key: "studentId", width: 14 },
];

export async function createStudentAccountsBatch(
  input: StudentBatchInput,
): Promise<StudentBatchResult> {
  const {
    gradeFrom,
    gradeTo,
    classCount,
    studentsPerClass,
    startNumber,
    creatorId,
  } = input;

  if (gradeFrom > gradeTo) {
    throw new Error("끝 학년은 시작 학년보다 크거나 같아야 합니다.");
  }

  if (classCount <= 0 || studentsPerClass <= 0) {
    throw new Error("반 수와 학생 수는 1 이상이어야 합니다.");
  }

  const totalGrades = gradeTo - gradeFrom + 1;
  const totalStudents = totalGrades * classCount * studentsPerClass;

  if (totalStudents <= 0) {
    throw new Error("생성할 학생 계정이 없습니다.");
  }

  if (totalStudents > STUDENT_BATCH_SIZE_LIMIT) {
    throw new Error(
      `한 번에 최대 ${STUDENT_BATCH_SIZE_LIMIT}명의 학생만 생성할 수 있습니다.`,
    );
  }

  const generateUniqueCode = await createUniqueCodeFactory();
  const plannedStudents: PlannedStudent[] = [];

  for (let grade = gradeFrom; grade <= gradeTo; grade++) {
    for (let classNumber = 1; classNumber <= classCount; classNumber++) {
      for (let offset = 0; offset < studentsPerClass; offset++) {
        const studentNumber = startNumber + offset;
        const studentId = formatStudentId({
          grade,
          classNumber,
          studentNumber,
        });

        if (!studentId) {
          throw new Error("학번을 계산하지 못했습니다. 학년/반/번호를 확인해주세요.");
        }

        plannedStudents.push({
          grade,
          classNumber,
          studentNumber,
          code: generateUniqueCode(),
          studentId,
        });
      }
    }
  }

  const codes = plannedStudents.map((student) => student.code);
  const previewAccounts = createPreview(plannedStudents);

  const { persistedStudents, batchId } = await prisma.$transaction(async (tx) => {
    await tx.user.createMany({
      data: plannedStudents.map((student) => ({
        role: "STUDENT",
        grade: student.grade,
        classNumber: student.classNumber,
        studentNumber: student.studentNumber,
        code: student.code,
        nickname: student.studentId,
      })),
    });

    const inserted = await tx.user.findMany({
      where: { code: { in: codes } },
      select: {
        grade: true,
        classNumber: true,
        studentNumber: true,
        code: true,
      },
      orderBy: [
        { grade: "asc" },
        { classNumber: "asc" },
        { studentNumber: "asc" },
      ],
    });

    const payload: StudentBatchPayload = {
      version: 1,
      kind: "student",
      params: {
        gradeFrom,
        gradeTo,
        classCount,
        studentsPerClass,
        startNumber,
      },
      result: {
        total: inserted.length,
        preview: previewAccounts,
      },
    };

    const batch = await tx.accountBatch.create({
      data: {
        createdBy: creatorId,
        kind: AccountBatchKind.STUDENT,
        payload,
      },
      select: { id: true },
    });

    return {
      persistedStudents: normalizeStudentRows(inserted),
      batchId: batch.id,
    };
  });

  const fileStoragePath = await writeStudentWorkbook(persistedStudents, batchId);

  await prisma.accountBatch.update({
    where: { id: batchId },
    data: { xlsxPath: fileStoragePath },
  });

  return {
    batchId,
    createdCount: persistedStudents.length,
    downloadPath: getBatchDownloadUrl(batchId),
    previewAccounts,
  };
}

function createPreview(students: PlannedStudent[]): StudentAccountPreview[] {
  return students.slice(0, 5).map((student) => ({
    grade: student.grade,
    classNumber: student.classNumber,
    studentNumber: student.studentNumber,
    code: student.code,
    studentId: student.studentId,
  }));
}

function normalizeStudentRows(rows: Array<{
  grade: number | null;
  classNumber: number | null;
  studentNumber: number | null;
  code: string;
}>): PersistedStudentRow[] {
  return rows.map((row) => {
    if (
      row.grade === null ||
      row.classNumber === null ||
      row.studentNumber === null
    ) {
      throw new Error("생성된 학생 데이터에 필수 값이 누락되었습니다.");
    }

    const studentId = formatStudentId(row);

    if (!studentId) {
      throw new Error("학번을 계산하지 못했습니다.");
    }

    return {
      grade: row.grade,
      classNumber: row.classNumber,
      studentNumber: row.studentNumber,
      code: row.code,
      studentId,
    };
  });
}

async function writeStudentWorkbook(
  students: PersistedStudentRow[],
  batchId: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Festival Connect";
  workbook.created = new Date();

  const gradeGroups = groupStudentsByGrade(students);

  if (gradeGroups.length === 0) {
    gradeGroups.push([0, []]);
  }

  for (const [grade, records] of gradeGroups) {
    const worksheet = workbook.addWorksheet(`${grade}학년`);
    worksheet.columns = STUDENT_WORKSHEET_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));

    records.forEach((student) => {
      worksheet.addRow({
        grade: student.grade,
        classNumber: student.classNumber,
        studentNumber: student.studentNumber,
        code: student.code,
        studentId: student.studentId,
      });
    });

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: STUDENT_WORKSHEET_COLUMNS.length },
    };
  }

  const relativeFsPath = path.join("uploads", "batches", `${batchId}.xlsx`);
  const absolutePath = path.join(process.cwd(), "public", relativeFsPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await workbook.xlsx.writeFile(absolutePath);

  return `/${relativeFsPath.split(path.sep).join("/")}`;
}

function groupStudentsByGrade(students: PersistedStudentRow[]) {
  const map = new Map<number, PersistedStudentRow[]>();

  for (const student of students) {
    const current = map.get(student.grade) ?? [];
    current.push(student);
    map.set(student.grade, current);
  }

  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}
