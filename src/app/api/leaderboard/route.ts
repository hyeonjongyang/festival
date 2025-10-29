import { NextResponse } from "next/server";
import {
  fetchLeaderboard,
  normalizeLeaderboardGrade,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeParam = searchParams.get("grade");
  const grade = normalizeLeaderboardGrade(gradeParam);

  try {
    const leaderboard = await fetchLeaderboard({ grade });
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("리더보드를 불러오지 못했습니다.", error);
    return NextResponse.json(
      { message: "리더보드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
