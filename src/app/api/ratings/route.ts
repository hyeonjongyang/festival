import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { rateBooth, updateBoothRating } from "@/lib/ratings";
import { BoothNotFoundError } from "@/lib/visits/errors";
import {
  BoothRatingConflictError,
  BoothRatingEditWindowExpiredError,
  BoothRatingNotFoundError,
  MissingVisitHistoryError,
} from "@/lib/ratings/errors";

const ratingSchema = z.object({
  boothId: z
    .string({ message: "부스 ID가 필요합니다." })
    .min(1, { message: "부스 ID가 필요합니다." }),
  score: z
    .number({ message: "평점은 숫자여야 합니다." })
    .min(1, { message: "평점은 1 이상이어야 합니다." })
    .max(5, { message: "평점은 5 이하여야 합니다." }),
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

  const parsed = ratingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "올바르지 않은 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const rating = await rateBooth({
      boothId: parsed.data.boothId,
      studentId: session.id,
      score: parsed.data.score,
    });

    return NextResponse.json({ rating });
  } catch (error) {
    if (error instanceof BoothNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof MissingVisitHistoryError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof BoothRatingConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof RangeError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    console.error("평점 저장 중 오류가 발생했습니다.", error);
    return NextResponse.json(
      { message: "평점을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

  const parsed = ratingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "올바르지 않은 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const rating = await updateBoothRating({
      boothId: parsed.data.boothId,
      studentId: session.id,
      score: parsed.data.score,
    });

    return NextResponse.json({ rating });
  } catch (error) {
    if (error instanceof BoothNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof MissingVisitHistoryError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof BoothRatingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof BoothRatingEditWindowExpiredError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    if (error instanceof RangeError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    console.error("평점 수정 중 오류가 발생했습니다.", error);
    return NextResponse.json(
      { message: "평점을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}
