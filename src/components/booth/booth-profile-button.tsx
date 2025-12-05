"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { mutate as mutateGlobal } from "swr";
import { cn } from "@/lib/client/cn";
import { HttpError, jsonFetch } from "@/lib/client/http";
import { useBoothProfile } from "@/hooks/use-booth-profile";

type FieldErrors = Record<string, string[]>;

const DEFAULT_FORM = {
  name: "",
  location: "",
  description: "",
};

export function BoothProfileButton() {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const headingId = useId();
  const nameId = useId();
  const locationId = useId();
  const descriptionId = useId();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  const { booth, isValidating, error, mutate } = useBoothProfile();

  useEffect(() => {
    if (!booth || !open) return;
    setForm({
      name: booth.name,
      location: booth.location ?? "",
      description: booth.description ?? "",
    });
  }, [booth?.name, booth?.location, booth?.description, open]);

  useEffect(() => {
    if (open) {
      void mutate();
    }
  }, [open, mutate]);

  const fetchError = useMemo(() => {
    if (!error) return null;
    if (error instanceof HttpError) {
      return error.message;
    }
    return "부스 정보를 불러오지 못했습니다.";
  }, [error]);

  const formLocked = saving || isValidating || !booth;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setFieldErrors({});

    try {
      await jsonFetch("/api/booth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          description: form.description,
        }),
      });

      setStatus("부스 정보를 업데이트했습니다.");
      await mutate();
      await mutateGlobal("/api/visits/dashboard");
    } catch (error) {
      if (error instanceof HttpError) {
        const issues = typeof error.data === "object" && error.data && "issues" in error.data
          ? (error.data as { issues?: FieldErrors }).issues ?? {}
          : {};
        setFieldErrors(issues);
        setStatus(error.message ?? "부스 정보를 저장하지 못했습니다.");
      } else {
        setStatus("부스 정보를 저장하지 못했습니다. 다시 시도해주세요.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="부스 프로필 열기"
        onClick={() => {
          setStatus(null);
          setFieldErrors({});
          setOpen(true);
        }}
        className="fixed right-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[var(--surface-muted)] text-white backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] sm:h-14 sm:w-14 overflow-hidden"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-12px] rounded-full bg-gradient-to-br from-black/55 via-black/30 to-white/5"
        />
        <ProfileIcon className="relative h-6 w-6 text-white sm:h-7 sm:w-7" />
      </button>

      {open && portalReady
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                aria-label="프로필 편집 닫기"
                className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/85 backdrop-blur-sm transition-opacity"
                onClick={() => setOpen(false)}
              />
              <div className="absolute inset-0 overflow-y-auto px-4 py-6 sm:py-12">
                <div className="relative mx-auto w-full max-w-2xl">
                  <div className="glass-card frosted relative overflow-hidden border border-[var(--outline-strong)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
                    <div className="relative border-b border-white/10 px-6 py-5 sm:px-7 sm:py-6">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70" />
                      <h2
                        id={headingId}
                        className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        프로필 편집
                      </h2>
                    </div>

                    <form aria-labelledby={headingId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5 sm:px-7 sm:py-6">
                      {!booth && isValidating ? (
                        <p className="rounded-xl border border-dashed border-[var(--outline)] bg-white/5 px-4 py-3 text-sm text-[var(--text-muted)]">
                          부스 정보를 불러오는 중입니다…
                        </p>
                      ) : null}

                      <div className="grid gap-4">
                        <Field
                          id={nameId}
                          label="부스 이름"
                          value={form.name}
                          onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                          placeholder="예: 지구과학 동아리"
                          error={fieldErrors.name?.[0]}
                          disabled={formLocked}
                          required
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            id={locationId}
                            label="부스 위치"
                            value={form.location}
                            onChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
                            placeholder="예: 본관 1층 복도"
                            error={fieldErrors.location?.[0]}
                            disabled={formLocked}
                          />
                          <Field
                            id={descriptionId}
                            label="부스 소개"
                            value={form.description}
                            onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                            placeholder="활동, 체험, 한 줄 설명 등"
                            error={fieldErrors.description?.[0]}
                            disabled={formLocked}
                            multiline
                            rows={3}
                          />
                        </div>
                      </div>

                      {fetchError ? (
                        <p className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                          {fetchError}
                        </p>
                      ) : null}

                      {status ? (
                        <p
                          role="status"
                          className={cn(
                            "rounded-xl border px-4 py-3 text-sm",
                            status.includes("업데이트")
                              ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--text-primary)]"
                              : "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]",
                          )}
                        >
                          {status}
                        </p>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center justify-center rounded-full border border-[var(--outline)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:border-[var(--outline-strong)] hover:text-[var(--text-primary)]"
                        >
                          닫기
                        </button>
                        <button
                          type="submit"
                          disabled={saving || isValidating || !booth}
                          className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-gradient-to-r from-[#0052cc] via-[#007eff] to-[#00c2ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,90,200,0.45)] transition hover:shadow-[0_24px_50px_rgba(0,110,240,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "저장 중…" : "변경사항 저장"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function Field({ id, label, value, placeholder, error, required, multiline, rows, disabled, onChange }: FieldProps) {
  const baseClasses =
    "w-full rounded-2xl border border-black/40 bg-white/5 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition";

  return (
    <label className="space-y-2" htmlFor={id}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      </div>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows ?? 3}
          disabled={disabled}
          required={required}
          className={cn(baseClasses, "resize-none", disabled && "opacity-60 cursor-not-allowed")}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(baseClasses, disabled && "opacity-60 cursor-not-allowed")}
        />
      )}
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </label>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20.2832 19.9316" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <g>
        <rect height="19.9316" opacity="0" width="20.2832" x="0" y="0" />
        <path
          d="M9.96094 19.9219C15.459 19.9219 19.9219 15.459 19.9219 9.96094C19.9219 4.46289 15.459 0 9.96094 0C4.46289 0 0 4.46289 0 9.96094C0 15.459 4.46289 19.9219 9.96094 19.9219ZM9.96094 18.2617C5.37109 18.2617 1.66016 14.5508 1.66016 9.96094C1.66016 5.37109 5.37109 1.66016 9.96094 1.66016C14.5508 1.66016 18.2617 5.37109 18.2617 9.96094C18.2617 14.5508 14.5508 18.2617 9.96094 18.2617ZM16.6406 16.3965L16.6113 16.2891C16.1328 14.8535 13.5547 13.2812 9.96094 13.2812C6.37695 13.2812 3.79883 14.8535 3.31055 16.2793L3.28125 16.3965C5.03906 18.1348 8.05664 19.1504 9.96094 19.1504C11.875 19.1504 14.8633 18.1445 16.6406 16.3965ZM9.96094 11.6211C11.8457 11.6406 13.3105 10.0391 13.3105 7.93945C13.3105 5.9668 11.8359 4.33594 9.96094 4.33594C8.08594 4.33594 6.60156 5.9668 6.61133 7.93945C6.62109 10.0391 8.08594 11.6016 9.96094 11.6211Z"
          fill="currentColor"
          fillOpacity="0.9"
        />
      </g>
    </svg>
  );
}
