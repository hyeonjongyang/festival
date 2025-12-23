import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(_request: Request, context: RouteContext) {
  const { path: segments } = await context.params;

  const safeRelative = sanitizeRelativePath(segments);
  if (!safeRelative) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const primary = path.join(process.cwd(), "uploads", safeRelative);
  const fallback = path.join(process.cwd(), "public", "uploads", safeRelative);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(primary);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        fileBuffer = await fs.readFile(fallback);
      } catch (fallbackError) {
        if ((fallbackError as NodeJS.ErrnoException).code === "ENOENT") {
          return new NextResponse("Not Found", {
            status: 404,
            headers: {
              "Cache-Control": "no-store",
            },
          });
        }
        console.error("업로드 파일을 읽지 못했습니다.", fallbackError);
        return new NextResponse("Failed to read file", { status: 500 });
      }
    } else {
      console.error("업로드 파일을 읽지 못했습니다.", error);
      return new NextResponse("Failed to read file", { status: 500 });
    }
  }

  const ext = path.extname(safeRelative).toLowerCase();
  const contentType = MIME_BY_EXTENSION[ext] ?? "application/octet-stream";

  const response = new NextResponse(fileBuffer as unknown as BodyInit);
  response.headers.set("Content-Type", contentType);
  response.headers.set("Content-Length", String(fileBuffer.byteLength));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function sanitizeRelativePath(segments: string[] | null | undefined) {
  if (!segments || segments.length === 0) {
    return null;
  }

  const joined = segments.join("/").replace(/\\/g, "/");
  const normalized = path.posix.normalize(joined);

  if (!normalized || normalized === "." || normalized.startsWith("..")) {
    return null;
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, "");
  if (!withoutLeadingSlash) {
    return null;
  }

  return withoutLeadingSlash;
}

