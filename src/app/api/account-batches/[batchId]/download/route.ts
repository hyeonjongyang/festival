import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { AccountBatchKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/get-session-user";

const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { batchId } = await params;
  const resolvedBatchId = batchId || extractBatchIdFromPath(request.nextUrl.pathname);

  if (!resolvedBatchId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const batch = await prisma.accountBatch.findUnique({
    where: { id: resolvedBatchId },
    select: {
      id: true,
      kind: true,
      createdAt: true,
      xlsxPath: true,
    },
  });

  if (!batch || !batch.xlsxPath) {
    return NextResponse.json({ error: "Excel 파일을 찾지 못했습니다." }, { status: 404 });
  }

  const absolutePath = resolveBatchFilePath(batch.xlsxPath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Excel 파일 경로가 잘못되었습니다." }, { status: 404 });
  }

  let fileBuffer: Buffer;

  try {
    fileBuffer = await fs.readFile(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Excel 파일을 찾지 못했습니다." }, { status: 404 });
    }

    throw error;
  }

  const response = new NextResponse(fileBuffer as unknown as BodyInit); // Cast to satisfy BodyInit for binary payload
  response.headers.set("Content-Type", EXCEL_MIME);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Content-Disposition", `attachment; filename="${createFilename(batch)}"`);
  response.headers.set("Content-Length", String(fileBuffer.byteLength));

  return response;
}

function resolveBatchFilePath(storedPath: string) {
  const trimmed = storedPath.trim();

  if (!trimmed) {
    return null;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  const normalized = path.posix.normalize(withoutLeadingSlash.replace(/\\/g, "/"));

  if (normalized.startsWith("..")) {
    return null;
  }

  if (normalized.startsWith("public/")) {
    return path.join(process.cwd(), normalized);
  }

  return path.join(process.cwd(), "public", normalized);
}

function createFilename(batch: { id: string; kind: AccountBatchKind }) {
  const prefix = batch.kind.toLowerCase();
  return `festival-${prefix}-batch-${batch.id}.xlsx`;
}

function extractBatchIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const accountBatchesIndex = segments.indexOf("account-batches");

  if (accountBatchesIndex === -1) {
    return null;
  }

  return segments[accountBatchesIndex + 1] ?? null;
}
