import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchFeedPage } from "@/lib/posts/feed";
import { FeedPanel } from "@/components/feed/feed-panel";
import { prisma } from "@/lib/prisma";

export default async function FeedPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/");
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
      <FeedPanel initialFeed={feed} viewerRole={session.role} viewerId={session.id} booth={booth} />
    </div>
  );
}
