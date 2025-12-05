import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  location: z.string().trim().max(60).nullish(),
  description: z.string().trim().max(400).nullish(),
});

export async function GET() {
  const session = await getSessionUser();

  if (!session || session.role !== "BOOTH_MANAGER") {
    return NextResponse.json({ message: "부스 관리자 계정이 필요합니다." }, { status: 401 });
  }

  const booth = await prisma.booth.findUnique({
    where: { ownerId: session.id },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
    },
  });

  if (!booth) {
    return NextResponse.json({ message: "연결된 부스를 찾을 수 없습니다." }, { status: 403 });
  }

  return NextResponse.json({
    booth: {
      name: booth.name,
      location: booth.location ?? null,
      description: booth.description ?? null,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();

  if (!session || session.role !== "BOOTH_MANAGER") {
    return NextResponse.json({ message: "부스 관리자 계정이 필요합니다." }, { status: 401 });
  }

  const booth = await prisma.booth.findUnique({
    where: { ownerId: session.id },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      owner: {
        select: {
          nicknameLocked: true,
        },
      },
    },
  });

  if (!booth) {
    return NextResponse.json({ message: "연결된 부스를 찾을 수 없습니다." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "요청 본문을 확인해주세요." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "입력값을 확인해주세요.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const name = parsed.data.name;
  const location = normalizeOptional(parsed.data.location);
  const description = normalizeOptional(parsed.data.description);

  const duplicate = await prisma.booth.findFirst({
    where: {
      name,
      NOT: { ownerId: session.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json(
      { message: "이미 같은 이름의 부스가 존재합니다. 다른 이름을 사용해주세요." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.booth.update({
      where: { id: booth.id },
      data: {
        name,
        location,
        description,
      },
    });

    if (booth.owner.nicknameLocked) {
      await tx.user.update({
        where: { id: session.id },
        data: { nickname: `${name} 운영팀` },
      });
    }
  });

  return NextResponse.json({
    message: "부스 정보를 업데이트했습니다.",
    booth: {
      name,
      location,
      description,
    },
  });
}

function normalizeOptional(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
