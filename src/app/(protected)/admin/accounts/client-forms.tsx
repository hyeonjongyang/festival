"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ADMIN_BATCH_INITIAL_STATE,
  BOOTH_BATCH_INITIAL_STATE,
  STUDENT_BATCH_INITIAL_STATE,
  STUDENT_FORM_DEFAULTS,
} from "./state";
import {
  handleAdminBatchAction,
  handleBoothBatchAction,
  handleStudentBatchAction,
} from "./actions";
import {
  ADMIN_BATCH_LIMIT,
  BOOTH_BATCH_LIMIT,
  STUDENT_BATCH_LIMIT_MESSAGE,
} from "@/lib/accounts/batch-constants";
import type { StudentBatchActionState } from "./state";
import type { StudentAccountPreview } from "@/lib/accounts/types";
import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function StudentBatchForm() {
  const [state, formAction] = useActionState(
    handleStudentBatchAction,
    STUDENT_BATCH_INITIAL_STATE,
  );

  return (
    <ManagementCard className="space-y-5">
      <header className="space-y-2">
        <ManagementEyebrow>STUDENTS</ManagementEyebrow>
        <h2 className="text-xl font-semibold text-foreground">학생 계정 생성</h2>
        <p className="text-sm text-soft">
          학년·반 범위를 지정하면 로그인 코드와 닉네임이 자동으로 할당됩니다.
        </p>
        <p className="text-xs text-muted">{STUDENT_BATCH_LIMIT_MESSAGE}</p>
      </header>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <LabeledInput
            label="시작 학년"
            name="gradeFrom"
            type="number"
            min={1}
            max={3}
            defaultValue={STUDENT_FORM_DEFAULTS.gradeFrom}
            required
          />
          <LabeledInput
            label="마지막 학년"
            name="gradeTo"
            type="number"
            min={1}
            max={3}
            defaultValue={STUDENT_FORM_DEFAULTS.gradeTo}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <LabeledInput
            label="학년별 반 수"
            name="classCount"
            type="number"
            min={1}
            max={30}
            defaultValue={STUDENT_FORM_DEFAULTS.classCount}
            required
          />
          <LabeledInput
            label="반당 학생 수"
            name="studentsPerClass"
            type="number"
            min={1}
            max={40}
            defaultValue={STUDENT_FORM_DEFAULTS.studentsPerClass}
            helper="현장 기준 30명"
            required
          />
        </div>

        <LabeledInput
          label="시작 학번"
          name="startNumber"
          type="number"
          min={1}
          max={99}
          defaultValue={STUDENT_FORM_DEFAULTS.startNumber}
          helper="각 반마다 동일한 시작 학번이 적용됩니다."
          required
        />

        <SubmitButton label="학생 계정 일괄 생성" />
      </form>

      <ActionMessage status={state.status} message={state.message} />

      {state.preview && state.preview.length > 0 ? (
        <StudentPreview preview={state.preview} total={state.total ?? 0} />
      ) : null}

      {state.downloadUrl ? (
        <a
          href={state.downloadUrl}
          download
          className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          target="_blank"
          rel="noreferrer"
        >
          Excel 다운로드 ({state.total?.toLocaleString()}명)
        </a>
      ) : null}
    </ManagementCard>
  );
}

export function BoothAccountsForm() {
  const [state, formAction] = useActionState(
    handleBoothBatchAction,
    BOOTH_BATCH_INITIAL_STATE,
  );

  return (
    <ManagementCard className="space-y-5">
      <header className="space-y-2">
        <ManagementEyebrow>BOOTH MANAGERS</ManagementEyebrow>
        <h2 className="text-xl font-semibold text-foreground">부스 관리자 계정</h2>
        <p className="text-sm text-soft">
          부스 이름을 기준으로 최대 {BOOTH_BATCH_LIMIT}개의 관리 계정을 한 번에 생성할 수 있습니다.
        </p>
      </header>

      <form action={formAction} className="space-y-4">
        <LabeledInput
          label="부스 이름"
          name="baseName"
          placeholder="예: 체험형 과학관"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <LabeledInput
            label="생성 개수"
            name="count"
            type="number"
            min={1}
            max={BOOTH_BATCH_LIMIT}
            defaultValue={1}
            required
          />
          <LabeledInput
            label="운영 위치"
            name="location"
            placeholder="예: 본관 1층"
          />
        </div>

        <LabeledTextarea
          label="설명"
          name="description"
          placeholder="간단한 설명 또는 운영 메모"
          rows={3}
        />

        <SubmitButton label="부스 계정 생성" />
      </form>

      <ActionMessage status={state.status} message={state.message} />

      {state.accounts && state.accounts.length > 0 ? (
        <AccountList
          items={state.accounts.map((account) => ({
            title: account.boothName,
            subtitle: account.nickname,
            code: account.code,
          }))}
        />
      ) : null}
    </ManagementCard>
  );
}

export function AdminAccountsForm() {
  const [state, formAction] = useActionState(
    handleAdminBatchAction,
    ADMIN_BATCH_INITIAL_STATE,
  );

  return (
    <ManagementCard className="space-y-5">
      <header className="space-y-2">
        <ManagementEyebrow>ADMINS</ManagementEyebrow>
        <h2 className="text-xl font-semibold text-foreground">전체 관리자 계정</h2>
        <p className="text-sm text-soft">
          표시 이름을 기준으로 최대 {ADMIN_BATCH_LIMIT}개의 계정을 생성합니다.
        </p>
      </header>

      <form action={formAction} className="space-y-4">
        <LabeledInput
          label="표시 이름"
          name="label"
          placeholder="예: 운영본부"
          required
        />

        <LabeledInput
          label="생성 개수"
          name="count"
          type="number"
          min={1}
          max={ADMIN_BATCH_LIMIT}
          defaultValue={1}
          required
        />

        <SubmitButton label="관리자 계정 생성" />
      </form>

      <ActionMessage status={state.status} message={state.message} />

      {state.accounts && state.accounts.length > 0 ? (
        <AccountList
          items={state.accounts.map((account) => ({
            title: account.label,
            subtitle: account.nickname,
            code: account.code,
          }))}
        />
      ) : null}
    </ManagementCard>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-[color:var(--theme-primary-strong)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {pending ? "처리 중..." : label}
    </button>
  );
}

function ActionMessage({
  status,
  message,
}: Pick<StudentBatchActionState, "status" | "message">) {
  if (status === "idle" || !message) {
    return null;
  }

  const tone =
    status === "error"
      ? "border-rose-500/40 bg-rose-400/10 text-rose-100"
      : "border-emerald-500/40 bg-emerald-400/10 text-emerald-100";

  return (
    <p className={`rounded-2xl border px-3 py-2 text-sm font-medium ${tone}`}>
      {message}
    </p>
  );
}

function StudentPreview({
  preview,
  total,
}: {
  preview: StudentAccountPreview[];
  total: number;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4 text-sm text-soft">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        <span>Preview</span>
        <span>{preview.length}건 · 총 {total.toLocaleString()}명</span>
      </div>
      <ul className="space-y-2">
        {preview.map((student) => (
          <li key={`${student.grade}-${student.classNumber}-${student.studentNumber}`} className="flex items-center justify-between gap-4">
            <span className="font-medium text-foreground">
              {student.grade}학년 {student.classNumber}반 {student.studentNumber}번
            </span>
            <span className="font-mono text-sm text-primary">{student.code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountList({
  items,
}: {
  items: Array<{ title: string; subtitle: string; code: string }>;
}) {
  return (
    <ul className="space-y-3 text-sm text-soft">
      {items.map((item) => (
        <li
          key={`${item.title}-${item.code}`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-3"
        >
          <div>
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted">{item.subtitle}</p>
          </div>
          <span className="font-mono text-primary">{item.code}</span>
        </li>
      ))}
    </ul>
  );
}

function LabeledInput({
  label,
  helper,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-soft">{label}</span>
      <input
        {...props}
        className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {helper ? <span className="text-xs text-muted">{helper}</span> : null}
    </label>
  );
}

function LabeledTextarea({
  label,
  helper,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; helper?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-soft">{label}</span>
      <textarea
        {...props}
        className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {helper ? <span className="text-xs text-muted">{helper}</span> : null}
    </label>
  );
}
