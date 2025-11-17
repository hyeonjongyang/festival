export type StudentBatchParams = {
  gradeFrom: number;
  gradeTo: number;
  classCount: number;
  studentsPerClass: number;
  startNumber: number;
};

export type StudentAccountPreview = {
  grade: number;
  classNumber: number;
  studentNumber: number;
  code: string;
  studentId: string;
};

export type StudentBatchResult = {
  batchId: string;
  createdCount: number;
  downloadPath: string;
  previewAccounts: StudentAccountPreview[];
};

export type StudentBatchPayload = {
  version: 1;
  kind: "student";
  params: StudentBatchParams;
  result: {
    total: number;
    preview: StudentAccountPreview[];
  };
};

export type BoothAccountSummary = {
  boothName: string;
  code: string;
  nickname: string;
};

export type BoothBatchResult = {
  batchId: string;
  accounts: BoothAccountSummary[];
};

export type BoothBatchPayload = {
  version: 1;
  kind: "booth";
  params: {
    baseName: string;
    count: number;
    location?: string;
    description?: string;
  };
  result: {
    total: number;
    booths: BoothAccountSummary[];
  };
};

export type AdminAccountSummary = {
  label: string;
  code: string;
  nickname: string;
};

export type AdminBatchResult = {
  batchId: string;
  accounts: AdminAccountSummary[];
};

export type AdminBatchPayload = {
  version: 1;
  kind: "admin";
  params: {
    label: string;
    count: number;
  };
  result: {
    total: number;
    admins: AdminAccountSummary[];
  };
};

export type AccountBatchPayload =
  | StudentBatchPayload
  | BoothBatchPayload
  | AdminBatchPayload;
