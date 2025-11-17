export type StudentNumberParams = {
  grade: number | null | undefined;
  classNumber: number | null | undefined;
  studentNumber: number | null | undefined;
};

const FALLBACK_LABEL = "학번 미지정";

export function formatStudentId(params: StudentNumberParams): string | null {
  const grade = normalizeNumber(params.grade);
  const classNumber = normalizeNumber(params.classNumber);
  const studentNumber = normalizeNumber(params.studentNumber);

  if (grade === null || classNumber === null || studentNumber === null) {
    return null;
  }

  return `${grade}${String(classNumber).padStart(2, "0")}${String(studentNumber).padStart(2, "0")}`;
}

export function describeStudentId(
  params: StudentNumberParams,
  fallback = FALLBACK_LABEL,
): string {
  return formatStudentId(params) ?? fallback;
}

function normalizeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}
