import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchFeedPage } from "@/lib/posts/feed";
import { FeedPanel } from "@/components/feed/feed-panel";
import { prisma } from "@/lib/prisma";
import { fetchTrendingBooths, type TrendingBoothResult } from "@/lib/leaderboard/trending";
import { TRENDING_WINDOW_MINUTES } from "@/lib/config/constants";

type FeedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const resolvedSearchParams = await searchParams;
  const searchString = buildSearchString(resolvedSearchParams);
  const nextPath = searchString ? `/feed?${searchString}` : "/feed";

  const session = await getSessionUser();

  if (!session) {
    redirect(`/?next=${encodeURIComponent(nextPath)}`);
  }

  const feedPromise = fetchFeedPage();
  const trendingPromise = fetchTrendingBooths().catch((error) => {
    console.error("Failed to fetch trending booths for feed page.", error);
    const fallback: TrendingBoothResult = {
      generatedAt: new Date().toISOString(),
      windowMinutes: TRENDING_WINDOW_MINUTES,
      entries: [],
      source: "recent",
    };
    return fallback;
  });
  const boothPromise =
    session.role === "BOOTH_MANAGER"
      ? prisma.booth.findUnique({
          where: { ownerId: session.id },
          select: { name: true, location: true, description: true },
        })
      : Promise.resolve(null);
  const [feed, trending, booth] = await Promise.all([feedPromise, trendingPromise, boothPromise]);

  return (
    <div className="space-y-6">
      <FeedPanel
        initialFeed={feed}
        initialTrending={trending}
        viewerRole={session.role}
        viewerId={session.id}
        booth={booth}
      />
    </div>
  );
}

function buildSearchString(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      search.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    }
  });

  return search.toString();
}
