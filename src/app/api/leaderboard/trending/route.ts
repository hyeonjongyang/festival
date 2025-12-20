import { NextResponse } from "next/server";
import { fetchTrendingBooths } from "@/lib/leaderboard/trending";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trending = await fetchTrendingBooths();
    return NextResponse.json({ trending });
  } catch (error) {
    console.error("실시간 인기 부스를 불러오지 못했습니다.", error);
    return NextResponse.json(
      { message: "실시간 인기 부스를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
