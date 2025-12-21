"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { jsonFetch, HttpError } from "@/lib/client/http";
import { formatCompactDate } from "@/lib/client/time";
import type { RecordVisitResult } from "@/types/api";
import { RatingModal } from "@/components/ratings/rating-modal";
import { extractBoothTokenFromQrPayload } from "@/lib/visits/qr-payload";

type VisitScannerProps = {
  onRecorded?: (result: RecordVisitResult) => void;
};

export type VisitScannerControllerRenderProps = {
  openScanner: () => void;
  closeScanner: () => void;
  submitToken: (token: string, options?: { source: "qr" | "manual" }) => Promise<void>;
  manualToken: string;
  setManualToken: (value: string) => void;
  status: { tone: "error" | "info"; message: string } | null;
  pending: boolean;
  bannerClass: string;
  isScannerOpen: boolean;
};

type VisitScannerControllerProps = {
  onRecorded?: (result: RecordVisitResult) => void;
  children: (props: VisitScannerControllerRenderProps) => ReactNode;
};

export function VisitScannerController({ onRecorded, children }: VisitScannerControllerProps) {
  const [open, setOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [status, setStatus] = useState<{ tone: "error" | "info"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [ratingPrompt, setRatingPrompt] = useState<{ boothId: string; boothName: string } | null>(null);
  const [isPortalReady, setPortalReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setPortalReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);
  const portalTarget = isPortalReady ? document.body : null;

  const submitToken = useCallback(
    async (token: string, options: { source: "qr" | "manual" } = { source: "manual" }) => {
      const trimmed = token.trim();
      const boothToken = extractBoothTokenFromQrPayload(trimmed);

      if (!boothToken) {
        setStatus({ tone: "error", message: "QR 토큰을 입력해주세요." });
        return;
      }

      setPending(true);
      setStatus(null);
      try {
        const payload = await jsonFetch<RecordVisitResult>("/api/visits/record", {
          method: "POST",
          body: JSON.stringify({ boothToken }),
        });

        if (options.source === "qr" && payload.ratingStatus.hasRated) {
          setStatus({
            tone: "info",
            message: "이미 방문한 부스입니다.",
          });
        }

        setManualToken("");
        setOpen(false);
        onRecorded?.(payload);

        if (options.source === "qr" && !payload.ratingStatus.hasRated) {
          setRatingPrompt({
            boothId: payload.ratingStatus.boothId,
            boothName: payload.visit.boothName,
          });
        }
      } catch (error) {
        if (error instanceof HttpError) {
          const lastVisitedAt = error.data?.lastVisitedAt
            ? formatCompactDate(error.data.lastVisitedAt)
            : null;
          setStatus({
            tone: "error",
            message: lastVisitedAt ? `${error.message} · 마지막 방문 ${lastVisitedAt}` : error.message,
          });
        } else {
          setStatus({ tone: "error", message: "방문을 기록하지 못했습니다." });
        }
      } finally {
        setPending(false);
      }
    },
    [onRecorded],
  );

  const bannerClass = useMemo(() => {
    switch (status?.tone) {
      case "info":
        return "border-[var(--accent)]/40 text-[var(--accent)]";
      case "error":
        return "border-[var(--danger)]/40 text-[var(--danger)]";
      default:
        return "border-[var(--outline)] text-[var(--text-muted)]";
    }
  }, [status?.tone]);

  const handleQrDetect = useCallback(
    (token: string) => {
      setOpen(false);
      return submitToken(token, { source: "qr" });
    },
    [submitToken],
  );

  return (
    <>
      {children({
        openScanner: () => setOpen(true),
        closeScanner: () => setOpen(false),
        submitToken,
        manualToken,
        setManualToken,
        status,
        pending,
        bannerClass,
        isScannerOpen: open,
      })}

      {open && portalTarget
        ? createPortal(
            <ScannerModal onClose={() => setOpen(false)} onDetect={handleQrDetect} busy={pending} />,
            portalTarget,
          )
        : null}

      {ratingPrompt && portalTarget
        ? createPortal(
            <RatingModal
              boothId={ratingPrompt.boothId}
              boothName={ratingPrompt.boothName}
              onComplete={() => {
                setRatingPrompt(null);
              }}
            />,
            portalTarget,
          )
        : null}
    </>
  );
}

export function VisitScanner({ onRecorded }: VisitScannerProps) {
  return (
    <VisitScannerController onRecorded={onRecorded}>
      {({ openScanner, manualToken, setManualToken, submitToken, status, bannerClass, pending }) => {
        const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          submitToken(manualToken, { source: "manual" });
        };

        return (
          <section className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="chip mb-2">QR 방문</p>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">피드 스캐너</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  버튼을 눌러 카메라 스캐너를 열고, 각 부스에서 노출하는 QR을 향해 비춰주세요. 동일 부스는 1회만 인정됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={openScanner}
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[var(--accent-strong)]"
              >
                스캔 시작
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4 flex gap-3">
              <input
                type="text"
                inputMode="text"
                placeholder="직접 입력 시 QR 토큰"
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-[var(--outline)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)]"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
              >
                저장
              </button>
            </form>

            {status ? (
              <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${bannerClass}`}>
                {status.message}
              </p>
            ) : null}
          </section>
        );
      }}
    </VisitScannerController>
  );
}

type ScannerModalProps = {
  onClose: () => void;
  onDetect: (token: string) => void;
  busy?: boolean;
};

function ScannerModal({ onClose, onDetect, busy }: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const stopScanner = useCallback(() => {
    if (typeof window !== "undefined" && rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const reader = readerRef.current as (BrowserMultiFormatReader & { reset?: () => void }) | null;
    reader?.reset?.();
    readerRef.current = null;
    canvasRef.current = null;
    contextRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore pause errors when detaching the stream
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  const waitForVideoReady = useCallback(async (video: HTMLVideoElement) => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let attempts = 40;
      let intervalId = 0;

      const cleanup = () => {
        window.clearInterval(intervalId);
      };

      const checkDimensions = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          cleanup();
          resolve();
          return;
        }

        attempts -= 1;
        if (attempts <= 0) {
          cleanup();
          reject(new Error("VIDEO_NOT_READY"));
        }
      };

      intervalId = window.setInterval(checkDimensions, 100);
      checkDimensions();
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        return;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError("이 브라우저에서는 카메라를 사용할 수 없습니다.");
        }
        return;
      }

      stopScanner();
      scannedRef.current = false;
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoElement.srcObject = stream;
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("autoplay", "true");
        videoElement.setAttribute("muted", "true");
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.muted = true;

        const playPromise = videoElement.play();
        if (playPromise && typeof playPromise.then === "function") {
          await playPromise.catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            throw error;
          });
        }

        await waitForVideoReady(videoElement);

        if (cancelled) {
          return;
        }

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
        }
        contextRef.current = context;

        readerRef.current = new BrowserMultiFormatReader();

        const scanFrame = () => {
          if (cancelled || !readerRef.current || !canvasRef.current || !contextRef.current) {
            return;
          }

          const currentVideo = videoRef.current;
          if (!currentVideo) {
            return;
          }

          const { videoWidth, videoHeight, readyState } = currentVideo;
          if (!videoWidth || !videoHeight || readyState < 2) {
            rafRef.current = window.requestAnimationFrame(scanFrame);
            return;
          }

          if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
          }

          contextRef.current.drawImage(currentVideo, 0, 0, videoWidth, videoHeight);

          try {
            const result = readerRef.current.decodeFromCanvas(canvasRef.current);
            if (result && !scannedRef.current) {
              scannedRef.current = true;
              stopScanner();
              onDetect(result.getText());
              return;
            }
          } catch (error) {
            if (!(error instanceof Error && error.name === "NotFoundException")) {
              console.debug(error);
            }
          }

          rafRef.current = window.requestAnimationFrame(scanFrame);
        };

        rafRef.current = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        if (cancelled) {
          return;
        }

        let message = "카메라를 활성화하지 못했습니다. 권한을 확인해주세요.";
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            message = "카메라 접근 권한을 허용해주세요.";
          } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            message = "사용 가능한 카메라를 찾지 못했습니다.";
          } else if (error.name === "NotReadableError") {
            message = "카메라 장치를 사용할 수 없습니다. 다른 앱 사용 여부를 확인해주세요.";
          }
        } else if (error instanceof Error && error.message === "VIDEO_NOT_READY") {
          message = "카메라 영상이 준비되지 않았습니다. 다시 시도해주세요.";
        }

        setCameraError(message);
        console.error(error);
        stopScanner();
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onDetect, stopScanner, waitForVideoReady]);

  return (
    <div className="scanner-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" data-reveal="skip">
      <div className="glass-card frosted w-full max-w-md rounded-[32px] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">QR 인식 중</h3>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--outline)] px-3 py-1 text-xs text-[var(--text-muted)]"
            onClick={() => {
              stopScanner();
              onClose();
            }}
          >
            닫기
          </button>
        </div>

        <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-[24px] border border-[var(--outline)] bg-black/40">
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-[32px] border-2 border-[var(--accent)]/60" />
          </div>
        </div>

        {cameraError ? (
          <p className="mt-3 rounded-2xl border border-[var(--danger)]/40 px-4 py-3 text-sm text-[var(--danger)]">
            {cameraError}
          </p>
        ) : null}

        {busy ? (
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">기록 중…</p>
        ) : null}
      </div>
    </div>
  );
}
