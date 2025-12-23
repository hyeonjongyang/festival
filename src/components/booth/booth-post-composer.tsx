"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { POST_BODY_MAX_LENGTH, POST_IMAGE_MAX_BYTES } from "@/lib/config/constants";
import { prepareUploadImage } from "@/lib/client/image-upload";

type BoothPostComposerProps = {
  onPostCreated?: (postId: string | null) => void;
};

const MAX_IMAGE_SIZE_MB = Math.round(POST_IMAGE_MAX_BYTES / (1024 * 1024));
const IMAGE_MAX_DIMENSION = 2200;

export function BoothPostComposer({ onPostCreated }: BoothPostComposerProps) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const latestImageTaskId = useRef(0);

  const isBusy = pending || processingImage;
  const buttonLabel = useMemo(() => {
    if (processingImage) return "이미지 준비 중…";
    if (pending) return "업로드 중…";
    return "피드 게시";
  }, [pending, processingImage]);

  const handleImageChange = async (next: File | null) => {
    const taskId = (latestImageTaskId.current += 1);
    setCreatedId(null);
    setErrorMessage(null);

    if (!next) {
      setFile(null);
      return;
    }

    setProcessingImage(true);
    try {
      const prepared = await prepareUploadImage(next, {
        maxBytes: POST_IMAGE_MAX_BYTES,
        maxDimension: IMAGE_MAX_DIMENSION,
        outputMimeType: "image/jpeg",
      });
      if (latestImageTaskId.current === taskId) {
        setFile(prepared);
      }
    } catch (error) {
      if (latestImageTaskId.current === taskId) {
        setFile(null);
        const isHeic =
          next.type === "image/heic" ||
          next.type === "image/heif" ||
          next.name.toLowerCase().endsWith(".heic") ||
          next.name.toLowerCase().endsWith(".heif");
        setErrorMessage(
          isHeic
            ? "HEIC 사진은 기기/브라우저에 따라 업로드 전 변환이 실패할 수 있어요. iPhone이라면 설정 > 카메라 > 포맷을 '높은 호환성'으로 바꾼 뒤 다시 찍어서 시도해주세요."
            : error instanceof Error
              ? error.message
              : "이미지를 처리하지 못했습니다. 다른 사진으로 시도해주세요.",
        );
      }
    } finally {
      if (latestImageTaskId.current === taskId) {
        setProcessingImage(false);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();

    if (isBusy) return;

    if (trimmed.length === 0) {
      setErrorMessage("본문을 입력해주세요.");
      return;
    }

    if (trimmed.length > POST_BODY_MAX_LENGTH) {
      setErrorMessage(`본문은 ${POST_BODY_MAX_LENGTH}자 이하로 작성해주세요.`);
      return;
    }

    if (!file || file.size === 0) {
      setErrorMessage("대표 이미지를 첨부해주세요.");
      return;
    }

    if (file.size > POST_IMAGE_MAX_BYTES) {
      setErrorMessage(`이미지는 ${MAX_IMAGE_SIZE_MB}MB 이하로 업로드해주세요. (자동 최적화에 실패했어요)`);
      return;
    }

    setPending(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("body", trimmed);
    formData.append("image", file);

    let timeout: number | null = null;
    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 90_000);
      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.message ?? "피드를 게시하지 못했습니다.");
      }

      setErrorMessage(null);
      setBody("");
      setFile(null);
      setFileInputResetKey((key) => key + 1);
      setCreatedId(json.postId ?? null);
      onPostCreated?.(json.postId ?? null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setErrorMessage("업로드가 너무 오래 걸려서 중단했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "피드를 게시하지 못했습니다.");
      }
    } finally {
      if (timeout) window.clearTimeout(timeout);
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pb-6 pt-4">
      <div className="flex flex-col">
        <textarea
          id="post-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          aria-label="게시글 내용"
          placeholder="무슨 일이 일어나고 있나요?"
          className="w-full rounded-3xl border border-[var(--outline)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--text-primary)] shadow-inner shadow-black/5"
          maxLength={POST_BODY_MAX_LENGTH}
        />
        <p className="mt-2 text-right text-xs text-[var(--text-muted)]">
          {body.length}/{POST_BODY_MAX_LENGTH}
        </p>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-semibold text-[var(--text-primary)]">대표 이미지 업로드</label>
        <input
          key={fileInputResetKey}
          type="file"
          accept="image/*"
          required
          aria-required="true"
          onChange={(event) => void handleImageChange(event.target.files?.[0] ?? null)}
          className="mt-2 w-full rounded-2xl border border-dashed border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]"
        />
        {file ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            준비된 이미지: {Math.max(1, Math.round((file.size / 1024 / 1024) * 10) / 10)}MB
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isBusy}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {errorMessage ? (
        <p className="rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {createdId ? (
        <p className="text-xs text-[var(--text-muted)]">게시글 ID: {createdId}</p>
      ) : null}
    </form>
  );
}
