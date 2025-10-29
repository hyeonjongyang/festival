import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";
import { awardPointsWithQrToken } from "@/lib/points/award";
import {
  DuplicateAwardError,
  StudentNotFoundError,
} from "@/lib/points/errors";

const awardSchema = z.object({
  qrToken: z
    .string({ message: "QR 토큰은 문자열이어야 합니다." })
    .min(1, { message: "QR 토큰이 필요합니다." }),
});

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session || (session.role !== "BOOTH_MANAGER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { message: "부스 관리자 권한이 필요합니다." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 본문이 필요합니다." },
      { status: 400 },
    );
  }

  const parsed = awardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "올바르지 않은 요청입니다." },
      { status: 400 },
    );
  }

  const booth = await prisma.booth.findUnique({
    where: { ownerId: session.id },
    select: { id: true },
  });

  if (!booth) {
    return NextResponse.json(
      { message: "연결된 부스를 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  try {
    const log = await awardPointsWithQrToken({
      boothId: booth.id,
      qrToken: parsed.data.qrToken,
    });

    return NextResponse.json({ log });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof DuplicateAwardError) {
      return NextResponse.json(
        {
          message: error.message,
          availableAt: error.availableAt.toISOString(),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "포인트를 지급하지 못했습니다." },
      { status: 500 },
    );
  }
}
