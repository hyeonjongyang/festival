"use client";

import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import type { BoothVisitsDashboard } from "@/types/api";
import { useBoothDashboard } from "@/hooks/use-booth-dashboard";
import { formatCompactDate } from "@/lib/client/time";
import { createBoothVisitUrl } from "@/lib/visits/qr-payload";

type BoothDashboardProps = {
  initial: BoothVisitsDashboard;
  origin: string;
};

function maskStudentIdentifier(identifier: string) {
  if (!/^[0-9]+$/.test(identifier)) {
    return identifier;
  }

  if (identifier.length <= 2) {
    return "**";
  }

  return `${identifier.slice(0, -2)}**`;
}

export function BoothDashboard({ initial, origin }: BoothDashboardProps) {
  const { dashboard } = useBoothDashboard(initial);
  const [status, setStatus] = useState<string | null>(null);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const boothToken = dashboard?.booth.qrToken ?? initial.booth.qrToken;
  const qrValue = (() => {
    try {
      return createBoothVisitUrl(origin, boothToken) || boothToken;
    } catch {
      return boothToken;
    }
  })();

  if (!dashboard) {
    return (
      <p className="rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm text-[var(--text-muted)]">
        부스 정보를 불러오지 못했습니다.
      </p>
    );
  }

  const downloadQrCode = () => {
    const svg = qrContainerRef.current?.querySelector("svg") as SVGSVGElement | null;

    if (!dashboard || !svg) {
      setStatus("QR 코드가 아직 준비되지 않았습니다.");
      return;
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    const canvasSize = 1024;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        setStatus("QR 코드를 렌더링하지 못했습니다.");
        return;
      }

      const padding = Math.round(canvasSize * 0.06); // keep a subtle white frame in the export

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasSize, canvasSize);
      context.drawImage(image, padding, padding, canvasSize - padding * 2, canvasSize - padding * 2);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      const sanitized = dashboard.booth.name.replace(/[^a-z0-9가-힣]+/gi, "-").toLowerCase() || "booth";
      anchor.href = pngUrl;
      anchor.download = `${sanitized}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setStatus("QR 코드를 PNG로 저장했습니다.");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus("QR 코드를 다운로드하지 못했습니다.");
    };

    image.src = url;
  };

  return (
    <section className="space-y-4">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="chip inline-flex">내 부스</p>
            <h2 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              {dashboard.booth.name}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">{dashboard.booth.location ?? "위치 미정"}</p>
            {dashboard.booth.description ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">{dashboard.booth.description}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div ref={qrContainerRef} className="rounded-[18px] bg-white p-6 drop-shadow-[0_18px_32px_rgba(0,0,0,0.25)]">
            <QRCode
              value={qrValue}
              size={320}
              bgColor="#ffffff"
              fgColor="#040915"
              level="H"
            />
          </div>
          <button
            type="button"
            onClick={downloadQrCode}
            className="inline-flex w-full items-center justify-center rounded-full border border-[var(--outline)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.01]"
          >
            QR 코드 다운로드
          </button>
        </div>
        {status ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">{status}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-[var(--outline)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs text-[var(--text-muted)]">누적 방문</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{dashboard.stats.totalVisits}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--outline)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs text-[var(--text-muted)]">고유 방문자</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{dashboard.stats.uniqueVisitors}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">최근 방문 로그</p>
          <span className="text-xs text-[var(--text-muted)]">{dashboard.recentLogs.length}건</span>
        </div>
        {dashboard.recentLogs.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">아직 방문 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between rounded-2xl border border-[var(--outline)] px-4 py-2">
                <p className="font-semibold text-[var(--text-primary)]">{maskStudentIdentifier(log.studentIdentifier)}</p>
                <span className="text-xs text-[var(--text-muted)]">{formatCompactDate(log.visitedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
