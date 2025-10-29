"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";

type Banner =
  | {
      variant: "success" | "error";
      message: string;
    }
  | null;

type FeedComposerProps = {
  boothName: string;
  boothLocation?: string | null;
  bodyMaxLength: number;
  imageMaxBytes: number;
};

const allowedTypesLabel = "PNG · JPG · WEBP";

export function FeedComposerClient({
  boothName,
  boothLocation,
  bodyMaxLength,
  imageMaxBytes,
}: FeedComposerProps) {
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const imageMaxMb = useMemo(
    () => Math.round(imageMaxBytes / (1024 * 1024)),
    [imageMaxBytes],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setBanner(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const file = event.target.files?.[0];

      if (!file) {
        setImageFile(null);
        return;
      }

      if (file.size > imageMaxBytes) {
        setBanner({
          variant: "error",
          message: `이미지는 최대 ${imageMaxMb}MB까지만 업로드할 수 있습니다.`,
        });
        event.target.value = "";
        setImageFile(null);
        return;
      }

      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [imageMaxBytes, imageMaxMb, previewUrl],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      setBanner(null);

      if (body.trim().length === 0) {
        setBanner({
          variant: "error",
          message: "본문을 입력해주세요.",
        });
        return;
      }

      setIsSubmitting(true);

      const formData = new FormData();
      formData.set("body", body);

      if (imageFile) {
        formData.set("image", imageFile);
      }

      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          body: formData,
        });

        let payload: Record<string, unknown> | null = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "피드를 등록하지 못했습니다.",
          );
        }

        setBody("");
        setImageFile(null);

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }

        setBanner({
          variant: "success",
          message: "피드를 올렸어요! 학생 피드에서 즉시 확인할 수 있습니다.",
        });
      } catch (error) {
        setBanner({
          variant: "error",
          message:
            error instanceof Error
              ? error.message
              : "피드를 등록하지 못했습니다.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [body, imageFile, isSubmitting, previewUrl],
  );

  return (
    <ManagementCard className="space-y-5">
      <header className="space-y-2">
        <ManagementEyebrow>COMPOSER</ManagementEyebrow>
        <h2 className="text-xl font-semibold text-foreground">{boothName} 소식 작성</h2>
        <p className="text-sm text-soft">
          본문은 {bodyMaxLength}자까지 입력할 수 있으며, 이미지는 선택 사항입니다. 한
          게시글당 1장의 이미지가 첨부됩니다.
        </p>
      </header>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            banner.variant === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-soft">
            본문
            <span className="ml-2 text-xs text-muted">
              ({body.length}/{bodyMaxLength})
            </span>
          </label>
          <textarea
            value={body}
            maxLength={bodyMaxLength}
            onChange={(event) => setBody(event.target.value)}
            placeholder="예) 오후 2시부터 직접 만든 스페셜 음료를 선착순 30명에게 제공해요!"
            className="min-h-40 w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-base text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <p className="text-xs text-muted">
            위치: {boothLocation ?? "미정"} · 해시태그, 줄바꿈 모두 지원합니다.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-soft">
            이미지 (선택)
          </label>
          <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-soft">
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              className="block w-full cursor-pointer rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
            />
            <p className="mt-2 text-xs text-muted">
              {allowedTypesLabel}, 최대 {imageMaxMb}MB. 민감한 정보가 포함된 이미지는 업로드하지 마세요.
            </p>
          </div>

          {previewUrl ? (
            <div className="rounded-2xl border border-border bg-background/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                Preview
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="선택한 미리보기 이미지"
                className="mt-3 w-full rounded-2xl object-cover"
              />
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary px-5 py-3 text-base font-semibold text-foreground transition hover:bg-[color:var(--theme-primary-strong)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {isSubmitting ? "업로드 중..." : "피드 업로드"}
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-soft">
        <p className="font-semibold text-foreground">운영 메모</p>
        <ul className="ml-4 list-disc space-y-1 pt-2">
          <li>사진 교체가 필요하면 게시글을 삭제하고 새로 업로드하세요.</li>
          <li>업로드된 이미지는 `/public/uploads/posts`에 저장되며 하루 단위로 백업됩니다.</li>
          <li>민감 정보·학생 얼굴이 포함된 사진은 사전 동의를 받은 뒤 올려주세요.</li>
        </ul>
      </div>

      <Link
        href="/feed"
        className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background/70 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        메인 피드 바로가기
      </Link>
    </ManagementCard>
  );
}
