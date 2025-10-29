import type {
  AdminAccountSummary,
  BoothAccountSummary,
  StudentAccountPreview,
} from "@/lib/accounts/types";

type Status = "idle" | "success" | "error";

export type StudentBatchActionState = {
  status: Status;
  message?: string;
  total?: number;
  downloadUrl?: string;
  preview?: StudentAccountPreview[];
};

export type BoothBatchActionState = {
  status: Status;
  message?: string;
  accounts?: BoothAccountSummary[];
};

export type AdminBatchActionState = {
  status: Status;
  message?: string;
  accounts?: AdminAccountSummary[];
};

export const STUDENT_BATCH_INITIAL_STATE: StudentBatchActionState = {
  status: "idle",
};

export const BOOTH_BATCH_INITIAL_STATE: BoothBatchActionState = {
  status: "idle",
};

export const ADMIN_BATCH_INITIAL_STATE: AdminBatchActionState = {
  status: "idle",
};

export const STUDENT_FORM_DEFAULTS = {
  gradeFrom: 1,
  gradeTo: 3,
  classCount: 4,
  studentsPerClass: 30,
  startNumber: 1,
} as const;
