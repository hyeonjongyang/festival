import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchBoothLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { LeaderboardPanel } from "@/components/leaderboard/leaderboard-panel";

export default async function LeaderboardPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/");
  }

  const leaderboard = await fetchBoothLeaderboard();
  let highlightBoothId: string | null = null;

  if (session.role === "BOOTH_MANAGER") {
    const booth = await prisma.booth.findUnique({
      where: { ownerId: session.id },
      select: { id: true },
    });
    highlightBoothId = booth?.id ?? null;
  }

  return (
    <div className="space-y-6">
      <LeaderboardPanel initial={leaderboard} highlightBoothId={highlightBoothId} />
    </div>
  );
}
