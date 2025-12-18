import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchFeedPage } from "@/lib/posts/feed";
import { FeedPanel } from "@/components/feed/feed-panel";
import { prisma } from "@/lib/prisma";

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

  const feed = await fetchFeedPage();
  const booth =
    session.role === "BOOTH_MANAGER"
      ? await prisma.booth.findUnique({
          where: { ownerId: session.id },
          select: { name: true, location: true, description: true },
        })
      : null;

  return (
    <div className="space-y-6">
      <FeedPanel
        initialFeed={feed}
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
