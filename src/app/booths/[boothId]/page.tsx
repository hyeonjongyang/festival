import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { prisma } from "@/lib/prisma";
import { RATING_EDIT_WINDOW_MS } from "@/lib/ratings/policy";
import {
  fetchBoothPublicProfile,
  fetchBoothPublicRatingStats,
  fetchBoothReviewPage,
} from "@/lib/booth/public-page";
import { BoothPublicPage } from "@/components/booths/booth-public-page";

type PageProps = {
  params: Promise<{
    boothId: string;
  }>;
};

export default async function BoothPage({ params }: PageProps) {
  const session = await getSessionUser();

  if (!session) {
    const { boothId } = await params;
    redirect(`/?next=${encodeURIComponent(`/booths/${boothId}`)}`);
  }

  const { boothId } = await params;

  if (!boothId) {
    notFound();
  }

  const profilePromise = fetchBoothPublicProfile(boothId);
  const statsPromise = fetchBoothPublicRatingStats(boothId);
  const initialReviewsPromise = fetchBoothReviewPage({ boothId, limit: 10 });

  const myPromise =
    session.role === "STUDENT"
      ? prisma.$transaction([
          prisma.boothVisit.findFirst({
            where: { boothId, studentId: session.id },
            select: { visitedAt: true },
          }),
          prisma.boothRating.findUnique({
            where: { boothId_studentId: { boothId, studentId: session.id } },
            select: { score: true, review: true },
          }),
        ])
      : Promise.resolve([null, null] as const);

  const [booth, stats, initialReviews, [visit, rating]] = await Promise.all([
    profilePromise,
    statsPromise,
    initialReviewsPromise,
    myPromise,
  ]);

  if (!booth) {
    notFound();
  }

  return (
    <BoothPublicPage
      booth={booth}
      stats={stats}
      initialReviews={initialReviews}
      viewer={{ role: session.role, id: session.id }}
      my={
        session.role === "STUDENT"
          ? {
              visitedAt: visit?.visitedAt ? visit.visitedAt.toISOString() : null,
              rating: rating ? { score: rating.score, review: rating.review ?? null } : null,
              windowMs: RATING_EDIT_WINDOW_MS,
            }
          : null
      }
    />
  );
}

