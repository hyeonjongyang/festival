import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";
import { BoothAccessError } from "@/lib/visits/errors";

export async function POST() {
  const session = await getSessionUser();

  if (!session || (session.role !== "BOOTH_MANAGER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { message: "부스 관리자 권한이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const booth = await prisma.booth.findUnique({
      where: { ownerId: session.id },
      select: { id: true },
    });

    if (!booth) {
      throw new BoothAccessError();
    }

    const updated = await prisma.booth.update({
      where: { id: booth.id },
      data: {
        qrToken: randomUUID(),
      },
      select: {
        qrToken: true,
      },
    });

    return NextResponse.json({ qrToken: updated.qrToken });
  } catch (error) {
    if (error instanceof BoothAccessError) {
      return NextResponse.json(
        { message: "연결된 부스를 찾을 수 없습니다." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "QR 토큰을 새로고침하지 못했습니다." },
      { status: 500 },
    );
  }
}
