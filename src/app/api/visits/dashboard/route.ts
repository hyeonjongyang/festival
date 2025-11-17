import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchBoothVisitsDashboard } from "@/lib/visits/dashboard";
import { BoothAccessError } from "@/lib/visits/errors";

export async function GET() {
  const session = await getSessionUser();

  if (!session || (session.role !== "BOOTH_MANAGER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { message: "부스 관리자 권한이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const dashboard = await fetchBoothVisitsDashboard(session.id);
    return NextResponse.json({ dashboard });
  } catch (error) {
    if (error instanceof BoothAccessError) {
      return NextResponse.json(
        { message: "연결된 부스를 찾을 수 없습니다." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "부스 방문 대시보드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
