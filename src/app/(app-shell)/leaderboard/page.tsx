import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  fetchLeaderboard,
  normalizeLeaderboardGrade,
} from "@/lib/leaderboard";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

type LeaderboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function LeaderboardPage(props: LeaderboardPageProps) {
  const searchParams = props.searchParams ?? {};
  const gradeParam = resolveGradeParam(searchParams.grade);
  const grade = normalizeLeaderboardGrade(gradeParam);

  const [session, leaderboard] = await Promise.all([
    getSessionUser(),
    fetchLeaderboard({ grade }),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <LeaderboardClient
        initialData={leaderboard}
        viewerId={session?.role === "STUDENT" ? session.id : null}
      />
    </div>
  );
}

function resolveGradeParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}
