import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";
import {
  POST_BODY_MAX_LENGTH,
  POST_IMAGE_MAX_BYTES,
} from "@/lib/config/constants";
import { fetchFeedPage } from "@/lib/posts/feed";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);
const POST_IMAGE_MAX_MB = Math.round(POST_IMAGE_MAX_BYTES / (1024 * 1024));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : undefined;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

  try {
    const feed = await fetchFeedPage({
      cursor: cursor ?? undefined,
      limit,
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error("피드를 불러오지 못했습니다.", error);
    return NextResponse.json(
      { message: "피드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "BOOTH_MANAGER") {
    return NextResponse.json(
      { message: "부스 관리자만 피드를 등록할 수 있습니다." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "폼 데이터를 확인해주세요." },
      { status: 400 },
    );
  }

  const rawBody = formData.get("body");

  if (typeof rawBody !== "string") {
    return NextResponse.json(
      { message: "본문을 입력해주세요." },
      { status: 400 },
    );
  }

  const trimmedBody = rawBody.trim();

  if (trimmedBody.length === 0) {
    return NextResponse.json(
      { message: "본문은 비워둘 수 없습니다." },
      { status: 400 },
    );
  }

  if (trimmedBody.length > POST_BODY_MAX_LENGTH) {
    return NextResponse.json(
      {
        message: `본문은 ${POST_BODY_MAX_LENGTH}자 이하로 입력해주세요.`,
      },
      { status: 400 },
    );
  }

  const booth = await prisma.booth.findUnique({
    where: { ownerId: session.id },
    select: { id: true },
  });

  if (!booth) {
    return NextResponse.json(
      { message: "연결된 부스 정보를 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  const imageEntry = formData.get("image");
  const file = imageEntry instanceof File ? imageEntry : null;

  if (!file || file.size === 0) {
    return NextResponse.json(
      { message: "대표 이미지를 첨부해주세요." },
      { status: 400 },
    );
  }

  if (file.size > POST_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { message: `이미지는 ${POST_IMAGE_MAX_MB}MB 이하로 업로드해주세요.` },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: "PNG, JPG, WEBP 형식의 이미지만 지원합니다." },
      { status: 400 },
    );
  }

  const created = await prisma.post.create({
    data: {
      body: trimmedBody,
      authorId: session.id,
      boothId: booth.id,
    },
    select: {
      id: true,
    },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = resolveImageExtension(file.type, file.name);

  try {
    const relativePath = await writePostImage(created.id, buffer, extension);

    await prisma.post.update({
      where: { id: created.id },
      data: {
        imagePath: relativePath,
      },
    });
  } catch (error) {
    await prisma.post.delete({ where: { id: created.id } });
    console.error("이미지 업로드 실패", error);

    return NextResponse.json(
      {
        message: "이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message: "피드가 등록되었습니다.",
      postId: created.id,
    },
    { status: 201 },
  );
}

async function writePostImage(postId: string, buffer: Buffer, extension: string) {
  const relativeFsPath = path.join("uploads", "posts", postId, `image${extension}`);
  const absolutePath = path.join(process.cwd(), "public", relativeFsPath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  const normalizedRelativePath = relativeFsPath.split(path.sep).join("/");
  return `/${normalizedRelativePath}`;
}

function resolveImageExtension(mimeType: string, fileName?: string | null) {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  if (mimeType in map) {
    return map[mimeType];
  }

  if (fileName) {
    const ext = path.extname(fileName);
    if (ext) {
      return ext;
    }
  }

  return ".png";
}
