"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type SVGProps,
} from "react";
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
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

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
      setCopyState("idle");
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
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

  const handleCopyCode = async () => {
    if (!result?.code) return;

    try {
      await navigator.clipboard.writeText(result.code);
      setCopyState("copied");
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy login code", error);
      setCopyState("error");
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="register-form__grid">
        <RegisterTextField
          label="부스 이름"
          name="boothName"
          placeholder="예: 지구과학 동아리"
          value={form.boothName}
          onChange={(value) => updateField("boothName", value)}
          error={errorMessage("boothName")}
          required
        />
        <RegisterTextField
          label="부스 위치"
          name="location"
          placeholder="에: 1층 지구과학실"
          value={form.location}
          onChange={(value) => updateField("location", value)}
          error={errorMessage("location")}
        />
      </div>

      <RegisterTextArea
        label="부스 소개"
        name="description"
        placeholder="활동, 체험, 한 줄 설명 등 간단하게 적어주세요."
        value={form.description}
        onChange={(value) => updateField("description", value)}
        error={errorMessage("description")}
        rows={4}
        maxLength={400}
      />

      {!result ? (
        <button
          type="submit"
          className="register-submit"
          disabled={pending}
          aria-live="polite"
        >
          {pending ? "등록 접수 중…" : "부스 등록하기"}
        </button>
      ) : null}

      {status ? (
        <p role="status" className="register-status register-status--error">
          {status}
        </p>
      ) : null}

      {result ? (
        <div className="register-result">
          <p className="register-result__eyebrow">로그인 코드</p>
          <div className="register-result__code-row">
            <p className="register-result__code">{result.code}</p>
            <button
              type="button"
              className={cn(
                "register-copy-button",
                copyState === "copied" && "register-copy-button--success",
              )}
              onClick={handleCopyCode}
              aria-label="로그인 코드 복사"
            >
              <CopyIcon className="register-copy-button__icon" />
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copyState === "copied"
              ? "로그인 코드가 클립보드에 복사되었습니다."
              : copyState === "error"
                ? "코드를 복사하지 못했습니다. 브라우저 설정을 확인하세요."
                : ""}
          </span>
          <p className="register-result__warning">⚠️ 주의 ⚠️</p>
          <p className="register-result__note">
            이 페이지를 나가면 로그인 코드를 다시 볼 수 없습니다.
            <br />
            꼭 다른 곳에 기록해 두세요.
          </p>
          <div className="register-result__actions">
            <button
              type="button"
              className="register-submit register-result__login"
              onClick={() => router.push("/")}
            >
              로그인하러 가기
            </button>
          </div>
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

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20.332 24.5996"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g>
        <path
          d="M14.0625 0.976562L18.9941 5.98633C19.7266 6.73828 19.9707 7.5 19.9707 8.70117L19.9707 16.6309C19.9707 18.6621 18.9551 19.6973 16.9434 19.6973L15.2344 19.6973L15.2344 18.125L16.8555 18.125C17.8711 18.125 18.3984 17.5781 18.3984 16.6016L18.3984 8.25195L13.8281 8.25195C12.7051 8.25195 12.1582 7.71484 12.1582 6.58203L12.1582 1.57227L7.8418 1.57227C6.82617 1.57227 6.30859 2.12891 6.30859 3.0957L6.30859 4.87305L4.73633 4.87305L4.73633 3.06641C4.73633 1.03516 5.75195 0 7.76367 0L11.5039 0C12.5488 0 13.3691 0.263672 14.0625 0.976562ZM13.5742 6.34766C13.5742 6.68945 13.7109 6.83594 14.0527 6.83594L17.9883 6.83594L13.5742 2.34375Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        <path
          d="M0 21.5039C0 23.5449 1.00586 24.5703 3.02734 24.5703L12.207 24.5703C14.2285 24.5703 15.2344 23.5352 15.2344 21.5039L15.2344 13.877C15.2344 12.627 15.0879 12.0801 14.3066 11.2793L8.92578 5.80078C8.18359 5.03906 7.56836 4.87305 6.47461 4.87305L3.02734 4.87305C1.01562 4.87305 0 5.89844 0 7.93945ZM1.57227 21.4746L1.57227 7.95898C1.57227 7.00195 2.08984 6.44531 3.10547 6.44531L6.30859 6.44531L6.30859 12.1094C6.30859 13.3398 6.93359 13.9551 8.14453 13.9551L13.6621 13.9551L13.6621 21.4746C13.6621 22.4512 13.1348 22.998 12.1289 22.998L3.0957 22.998C2.08984 22.998 1.57227 22.4512 1.57227 21.4746ZM8.33008 12.4805C7.93945 12.4805 7.7832 12.3242 7.7832 11.9336L7.7832 6.80664L13.3594 12.4805Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
      </g>
    </svg>
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
