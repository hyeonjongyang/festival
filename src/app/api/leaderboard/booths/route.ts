import { NextResponse } from "next/server";
import { fetchBoothLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await fetchBoothLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("부스 리더보드를 불러오지 못했습니다.", error);
    return NextResponse.json(
      { message: "부스 리더보드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
