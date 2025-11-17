import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { recordVisitWithQrToken } from "@/lib/visits/record";
import {
  BoothNotFoundError,
  DuplicateVisitError,
} from "@/lib/visits/errors";

const recordSchema = z.object({
  boothToken: z
    .string({ message: "QR 토큰은 문자열이어야 합니다." })
    .min(1, { message: "QR 토큰이 필요합니다." }),
});

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정으로 로그인해야 합니다." },
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

  const parsed = recordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "올바르지 않은 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const result = await recordVisitWithQrToken({
      studentId: session.id,
      boothToken: parsed.data.boothToken,
    });

    return NextResponse.json({
      visit: result.visit,
      totalVisitCount: result.totalVisitCount,
      ratingStatus: result.ratingStatus,
    });
  } catch (error) {
    if (error instanceof BoothNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof DuplicateVisitError) {
      return NextResponse.json(
        {
          message: error.message,
          lastVisitedAt: error.lastVisitedAt.toISOString(),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "방문을 기록하지 못했습니다." },
      { status: 500 },
    );
  }
}
