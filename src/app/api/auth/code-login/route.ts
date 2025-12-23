import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatStudentId } from "@/lib/students/student-id";
import { getRequestIp, rateLimit } from "@/lib/security/rate-limit";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";

const loginSchema = z.object({
  code: z
    .string({ message: "코드는 문자열이어야 합니다." })
    .min(1, { message: "코드는 필수값입니다." })
    .regex(/^[A-Za-z0-9]{5}$/, {
      message: "5자리 영문 대문자/숫자 코드를 입력해주세요.",
    })
    .transform((value) => value.toUpperCase()),
});

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limiter = rateLimit({
    key: `code-login:${ip}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!limiter.allowed) {
    return NextResponse.json(
      { message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limiter.retryAfterSeconds),
        },
      },
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

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "올바르지 않은 요청입니다." },
      { status: 400 },
    );
  }

  const { code } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { code },
    select: {
      id: true,
      role: true,
      nickname: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
      visitCount: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "일치하는 계정을 찾을 수 없습니다." },
      { status: 401 },
    );
  }

  const token = createSessionToken(user.id, user.role);
  await setSessionCookie(token);

  return NextResponse.json({ user: { ...user, studentId: formatStudentId(user) } });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ message: "세션이 만료되었습니다." }, { status: 200 });
}
