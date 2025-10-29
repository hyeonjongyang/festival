import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  getNicknameSuggestions,
  updateStudentNickname,
} from "@/lib/students/nickname";
import {
  NicknameLockedError,
  StudentAccessError,
} from "@/lib/students/errors";

const nicknameRequestSchema = z.object({
  nickname: z.string(),
  lock: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정만 접근할 수 있습니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const countParam = searchParams.get("count");
  const parsedCount = countParam ? Number(countParam) : undefined;
  const suggestions = getNicknameSuggestions(parsedCount);

  return NextResponse.json({ suggestions });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정만 접근할 수 있습니다." },
      { status: 401 },
    );
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON 본문을 확인해주세요." },
      { status: 400 },
    );
  }

  const parsed = nicknameRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ?? "닉네임 요청 값을 확인해주세요.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateStudentNickname({
      userId: session.id,
      nickname: parsed.data.nickname,
      lock: parsed.data.lock,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NicknameLockedError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 },
      );
    }

    if (error instanceof StudentAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "닉네임 형식을 확인해주세요." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "닉네임을 변경하지 못했습니다." },
      { status: 500 },
    );
  }
}
