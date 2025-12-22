import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";
import { fetchBoothReviewPage } from "@/lib/booth/public-page";

type RouteContext = {
  params: Promise<{
    boothId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { boothId } = await context.params;

  if (!boothId) {
    return NextResponse.json(
      { message: "부스 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const boothExists = await prisma.booth.findUnique({
    where: { id: boothId },
    select: { id: true },
  });

  if (!boothExists) {
    return NextResponse.json(
      { message: "부스를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const page = await fetchBoothReviewPage({
      boothId,
      cursor: cursor ? cursor.trim() : null,
      limit,
    });

    return NextResponse.json({ page });
  } catch (error) {
    console.error("부스 리뷰 페이지를 불러오지 못했습니다.", error);
    return NextResponse.json(
      { message: "부스 리뷰를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

