"use client";

import { FormEvent, useState } from "react";
import { POST_BODY_MAX_LENGTH, POST_IMAGE_MAX_BYTES } from "@/lib/config/constants";

type BoothPostComposerProps = {
  onPostCreated?: (postId: string | null) => void;
};

const MAX_IMAGE_SIZE_MB = Math.round(POST_IMAGE_MAX_BYTES / (1024 * 1024));

export function BoothPostComposer({ onPostCreated }: BoothPostComposerProps) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();

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
      setErrorMessage(`이미지는 ${MAX_IMAGE_SIZE_MB}MB 이하로 업로드해주세요.`);
      return;
    }

    setPending(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("body", trimmed);
    formData.append("image", file);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
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
      setErrorMessage(error instanceof Error ? error.message : "피드를 게시하지 못했습니다.");
    } finally {
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
          accept="image/png,image/jpeg,image/webp"
          required
          aria-required="true"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 w-full rounded-2xl border border-dashed border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "업로드 중…" : "피드 게시"}
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
