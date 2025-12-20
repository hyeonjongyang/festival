export type DbTableKey =
  | "users"
  | "booths"
  | "boothVisits"
  | "posts"
  | "accountBatches"
  | "visitViolations"
  | "featureFlags"
  | "boothRatings";

export type DbColumnType = "string" | "number" | "boolean" | "date" | "enum" | "json";

export type DbColumn = {
  key: string;
  label: string;
  type: DbColumnType;
  sortable?: boolean;
  filterable?: boolean;
};

export type DbTableConfig = {
  key: DbTableKey;
  label: string;
  description: string;
  model: string;
  idField: string;
  idLabel: string;
  columns: DbColumn[];
  defaultSort: {
    key: string;
    dir: "asc" | "desc";
  };
  createExample: string;
  updateExample: string;
};

export const DB_TABLES: DbTableConfig[] = [
  {
    key: "users",
    label: "사용자",
    description: "학생 · 부스 관리자 · 운영진 계정",
    model: "user",
    idField: "id",
    idLabel: "사용자 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "role", label: "역할", type: "enum", sortable: true, filterable: true },
      { key: "nickname", label: "닉네임", type: "string", sortable: true, filterable: true },
      { key: "code", label: "로그인 코드", type: "string", sortable: true, filterable: true },
      { key: "grade", label: "학년", type: "number", sortable: true, filterable: true },
      { key: "classNumber", label: "반", type: "number", sortable: true, filterable: true },
      { key: "studentNumber", label: "번호", type: "number", sortable: true, filterable: true },
      { key: "nicknameLocked", label: "닉네임 고정", type: "boolean", sortable: true, filterable: true },
      { key: "visitCount", label: "방문 수", type: "number", sortable: true, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
      { key: "updatedAt", label: "수정일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "createdAt", dir: "desc" },
    createExample: `{
  "role": "STUDENT",
  "code": "12345",
  "nickname": "홍길동",
  "grade": 1,
  "classNumber": 2,
  "studentNumber": 3,
  "nicknameLocked": false
}`,
    updateExample: `{
  "nickname": "새 닉네임",
  "nicknameLocked": true
}`,
  },
  {
    key: "booths",
    label: "부스",
    description: "운영 중인 부스 정보",
    model: "booth",
    idField: "id",
    idLabel: "부스 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "name", label: "부스명", type: "string", sortable: true, filterable: true },
      { key: "ownerId", label: "관리자 ID", type: "string", sortable: true, filterable: true },
      { key: "location", label: "위치", type: "string", sortable: true, filterable: true },
      { key: "description", label: "설명", type: "string", sortable: false, filterable: true },
      { key: "qrToken", label: "QR 토큰", type: "string", sortable: true, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
      { key: "updatedAt", label: "수정일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "createdAt", dir: "desc" },
    createExample: `{
  "name": "부스 1",
  "ownerId": "user_id",
  "location": "체육관",
  "description": "소개를 입력하세요."
}`,
    updateExample: `{
  "name": "새 부스명",
  "location": "본관 1층"
}`,
  },
  {
    key: "boothVisits",
    label: "부스 방문",
    description: "학생 방문 기록",
    model: "boothVisit",
    idField: "id",
    idLabel: "방문 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "boothId", label: "부스 ID", type: "string", sortable: true, filterable: true },
      { key: "studentId", label: "학생 ID", type: "string", sortable: true, filterable: true },
      { key: "visitedAt", label: "방문 시각", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "visitedAt", dir: "desc" },
    createExample: `{
  "boothId": "booth_id",
  "studentId": "student_id"
}`,
    updateExample: `{
  "visitedAt": "2024-01-01T09:00:00.000Z"
}`,
  },
  {
    key: "posts",
    label: "피드 게시글",
    description: "부스 피드 콘텐츠",
    model: "post",
    idField: "id",
    idLabel: "게시글 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "authorId", label: "작성자 ID", type: "string", sortable: true, filterable: true },
      { key: "boothId", label: "부스 ID", type: "string", sortable: true, filterable: true },
      { key: "body", label: "본문", type: "string", sortable: false, filterable: true },
      { key: "imagePath", label: "이미지 경로", type: "string", sortable: false, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
      { key: "updatedAt", label: "수정일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "createdAt", dir: "desc" },
    createExample: `{
  "authorId": "user_id",
  "boothId": "booth_id",
  "body": "게시글 내용을 입력하세요."
}`,
    updateExample: `{
  "body": "수정된 게시글 내용"
}`,
  },
  {
    key: "accountBatches",
    label: "계정 배치",
    description: "대량 계정 발급 기록",
    model: "accountBatch",
    idField: "id",
    idLabel: "배치 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "createdBy", label: "생성자 ID", type: "string", sortable: true, filterable: true },
      { key: "kind", label: "종류", type: "enum", sortable: true, filterable: true },
      { key: "payload", label: "Payload", type: "json", sortable: false, filterable: false },
      { key: "xlsxPath", label: "엑셀 경로", type: "string", sortable: false, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "createdAt", dir: "desc" },
    createExample: `{
  "createdBy": "user_id",
  "kind": "STUDENT",
  "payload": {}
}`,
    updateExample: `{
  "xlsxPath": "/uploads/batches/sample.xlsx"
}`,
  },
  {
    key: "visitViolations",
    label: "방문 위반",
    description: "중복 방문 등 운영 경고",
    model: "visitViolation",
    idField: "id",
    idLabel: "위반 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "boothId", label: "부스 ID", type: "string", sortable: true, filterable: true },
      { key: "studentId", label: "학생 ID", type: "string", sortable: true, filterable: true },
      { key: "type", label: "유형", type: "enum", sortable: true, filterable: true },
      { key: "detectedAt", label: "감지 시각", type: "date", sortable: true, filterable: true },
      { key: "lastVisitedAt", label: "최근 방문", type: "date", sortable: true, filterable: true },
      { key: "availableAt", label: "재방문 가능", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "detectedAt", dir: "desc" },
    createExample: `{
  "boothId": "booth_id",
  "studentId": "student_id",
  "type": "DUPLICATE_VISIT",
  "lastVisitedAt": "2024-01-01T09:00:00.000Z",
  "availableAt": "2024-01-01T10:00:00.000Z"
}`,
    updateExample: `{
  "availableAt": "2024-01-01T11:00:00.000Z"
}`,
  },
  {
    key: "featureFlags",
    label: "기능 플래그",
    description: "관리 기능 토글",
    model: "featureFlag",
    idField: "key",
    idLabel: "플래그 키",
    columns: [
      { key: "key", label: "Key", type: "string", sortable: true, filterable: true },
      { key: "enabled", label: "활성화", type: "boolean", sortable: true, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
      { key: "updatedAt", label: "수정일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "key", dir: "asc" },
    createExample: `{
  "key": "booth-registration",
  "enabled": true
}`,
    updateExample: `{
  "enabled": false
}`,
  },
  {
    key: "boothRatings",
    label: "부스 평점",
    description: "학생 평점 기록",
    model: "boothRating",
    idField: "id",
    idLabel: "평점 ID",
    columns: [
      { key: "id", label: "ID", type: "string", sortable: true, filterable: true },
      { key: "boothId", label: "부스 ID", type: "string", sortable: true, filterable: true },
      { key: "studentId", label: "학생 ID", type: "string", sortable: true, filterable: true },
      { key: "score", label: "점수", type: "number", sortable: true, filterable: true },
      { key: "createdAt", label: "생성일", type: "date", sortable: true, filterable: true },
      { key: "updatedAt", label: "수정일", type: "date", sortable: true, filterable: true },
    ],
    defaultSort: { key: "createdAt", dir: "desc" },
    createExample: `{
  "boothId": "booth_id",
  "studentId": "student_id",
  "score": 4
}`,
    updateExample: `{
  "score": 5
}`,
  },
];

export function findDbTableConfig(key: string | null | undefined): DbTableConfig | null {
  if (!key) {
    return null;
  }
  return DB_TABLES.find((table) => table.key === key) ?? null;
}

export function getDbTableConfig(key: string | null | undefined): DbTableConfig {
  return findDbTableConfig(key) ?? DB_TABLES[0];
}

export function buildDbSelect(config: DbTableConfig): Record<string, true> {
  return config.columns.reduce<Record<string, true>>((acc, column) => {
    acc[column.key] = true;
    return acc;
  }, {});
}

export function buildDbOrderBy(
  config: DbTableConfig,
  sortField: string | null | undefined,
  sortDir: string | null | undefined,
) {
  if (!sortField) {
    return null;
  }
  const column = config.columns.find((item) => item.key === sortField && item.sortable !== false);
  if (!column) {
    return null;
  }
  const dir = sortDir === "desc" ? "desc" : "asc";
  return { [column.key]: dir };
}

export function buildDbWhere(
  config: DbTableConfig,
  filterField: string | null | undefined,
  filterValue: string | null | undefined,
) {
  if (!filterField || !filterValue) {
    return null;
  }
  const column = config.columns.find((item) => item.key === filterField && item.filterable !== false);
  if (!column) {
    return null;
  }

  switch (column.type) {
    case "string":
      return {
        [column.key]: {
          contains: filterValue,
        },
      };
    case "enum":
      return { [column.key]: filterValue.toUpperCase() };
    case "number": {
      const numericValue = Number(filterValue);
      if (!Number.isFinite(numericValue)) {
        return null;
      }
      return { [column.key]: numericValue };
    }
    case "boolean": {
      if (filterValue !== "true" && filterValue !== "false") {
        return null;
      }
      return { [column.key]: filterValue === "true" };
    }
    case "date": {
      const parsed = new Date(filterValue);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      const start = new Date(parsed);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return {
        [column.key]: {
          gte: start,
          lt: end,
        },
      };
    }
    default:
      return null;
  }
}

export function coerceDateFields(config: DbTableConfig, data: Record<string, unknown>) {
  const dateFields = config.columns
    .filter((column) => column.type === "date")
    .map((column) => column.key);

  for (const key of dateFields) {
    const value = data[key];
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        data[key] = parsed;
      }
    }
  }

  return data;
}

export function normalizeParam(value: string | string[] | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const trimmed = (value[0] ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}
