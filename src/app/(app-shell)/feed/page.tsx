import { fetchFeedPage } from "@/lib/posts/feed";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { FeedClient } from "./feed-client";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSessionUser();
  const initialFeed = await fetchFeedPage({
    viewerId: session?.role === "STUDENT" ? session.id : undefined,
  });

  return (
    <div className="flex flex-col gap-6 pb-10">
      <FeedClient initialFeed={initialFeed} />
    </div>
  );
}
