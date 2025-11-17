"use client";

import { FormEvent, useId, useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/client/cn";

type RegisterFormState = {
  boothName: string;
  location: string;
  description: string;
};

type FieldErrors = Record<string, string[]>;

const DEFAULT_FORM: RegisterFormState = {
  boothName: "",
  location: "",
  description: "",
};

type SubmissionResult = {
  code: string;
  qrToken: string;
  boothName: string;
};

export function RegisterForm() {
  const formId = useId();
  const [form, setForm] = useState<RegisterFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const updateField = (field: keyof RegisterFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setErrors({});

    try {
      const response = await fetch("/api/register/booth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boothName: form.boothName,
          location: form.location || undefined,
          description: form.description || undefined,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResult(null);
        setStatus(json.message ?? "부스를 등록하지 못했습니다.");
        setErrors(
          "issues" in json && json.issues && typeof json.issues === "object"
            ? (json.issues as FieldErrors)
            : {},
        );
        return;
      }

      setResult({
        code: json.code,
        qrToken: json.qrToken,
        boothName: json.boothName,
      });
      setStatus(null);
      setErrors({});
      setForm(() => ({ ...DEFAULT_FORM }));
    } catch (error) {
      console.error(error);
      setStatus("네트워크 오류로 등록에 실패했습니다. 다시 시도해주세요.");
      setResult(null);
    } finally {
      setPending(false);
    }
  };

  const errorMessage = (field: keyof RegisterFormState) => {
    return errors[field]?.[0];
  };

  return (
    <form className="register-form" aria-describedby={`${formId}-helper`} onSubmit={handleSubmit}>
        <p id={`${formId}-helper`} className="register-form__subtitle">
          필수 정보
        </p>
      <div className="register-form__grid">
        <RegisterTextField
          label="부스 이름"
          name="boothName"
          placeholder="예: 별빛 도넛 팝업"
          value={form.boothName}
          onChange={(value) => updateField("boothName", value)}
          error={errorMessage("boothName")}
          required
        />
        <RegisterTextField
          label="희망 위치"
          name="location"
          placeholder="체육관 입구, 잔디광장 등"
          value={form.location}
          onChange={(value) => updateField("location", value)}
          error={errorMessage("location")}
        />
      </div>

      <RegisterTextArea
        label="부스 소개 (선택)"
        name="description"
        placeholder="메뉴, 체험, 한 줄 설명 등 간단하게 적어주세요."
        value={form.description}
        onChange={(value) => updateField("description", value)}
        error={errorMessage("description")}
        rows={4}
        maxLength={400}
      />

      <button
        type="submit"
        className="register-submit"
        disabled={pending}
        aria-live="polite"
      >
        {pending ? "등록 접수 중…" : "부스 등록 요청 보내기"}
      </button>

      {status ? (
        <p role="status" className="register-status register-status--error">
          {status}
        </p>
      ) : null}

      {result ? (
        <div className="register-result">
          <p className="register-result__eyebrow">LOGIN CODE</p>
          <p className="register-result__code">{result.code}</p>
          <p className="register-result__meta">
            {result.boothName} · QR 코드는 방문 현황 페이지에서 내려받을 수 있습니다.
          </p>
          <ul>
            <li>코드를 잃어버리면 관리자 페이지에서만 재발급이 가능합니다.</li>
            <li>로그인 후 `/booth/visits`에서 실시간 QR과 방문 현황을 확인하세요.</li>
            <li>팀원이 여러 명이라면 동일 코드를 공유해 로그인할 수 있습니다.</li>
          </ul>
        </div>
      ) : null}
    </form>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
};

function RegisterTextField({
  label,
  name,
  value,
  placeholder,
  error,
  required,
  onChange,
  inputMode,
  maxLength,
}: TextFieldProps) {
  return (
    <label className={cn("register-field", error && "register-field--invalid")}>
      <span>{label}</span>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        className="register-input"
        aria-invalid={error ? "true" : undefined}
      />
      {error ? <span className="register-field__error">{error}</span> : null}
    </label>
  );
}

type TextAreaProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
};

function RegisterTextArea({
  label,
  name,
  value,
  placeholder,
  error,
  required,
  onChange,
  rows,
  maxLength,
}: TextAreaProps) {
  return (
    <label className={cn("register-field", "register-field--textarea", error && "register-field--invalid")}>
      <span>{label}</span>
      <textarea
        id={name}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className="register-input"
        aria-invalid={error ? "true" : undefined}
      />
      {error ? <span className="register-field__error">{error}</span> : null}
    </label>
  );
}
