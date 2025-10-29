import { redirect } from "next/navigation";
import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { POST_BODY_MAX_LENGTH, POST_IMAGE_MAX_BYTES } from "@/lib/config/constants";
import { prisma } from "@/lib/prisma";
import { FeedComposerClient } from "./feed-composer-client";

export default async function BoothFeedNewPage() {
  const session = await getSessionUser();

  if (!session || session.role === "STUDENT") {
    redirect("/");
  }

  const booth = await prisma.booth.findUnique({
    where: { ownerId: session.id },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
    },
  });

  if (!booth) {
    return <MissingBoothState />;
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
      aria-labelledby="booth-feed-heading"
    >
      <ManagementCard as="header" className="space-y-4">
        <ManagementEyebrow className="text-primary">FEED</ManagementEyebrow>
        <h1
          id="booth-feed-heading"
          className="text-3xl font-semibold text-foreground"
        >
          {booth.name ?? "내 부스"} 소식을 공유하세요
        </h1>
        <p className="text-sm text-soft">
          텍스트와 한 장의 이미지를 업로드하면 학생 피드(`/feed`)에서 즉시 노출됩니다.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-soft">
          <span className="rounded-full border border-border px-3 py-1">
            위치: {booth.location ?? "미정"}
          </span>
          {booth.description ? (
            <span className="rounded-full border border-border px-3 py-1">
              {booth.description}
            </span>
          ) : null}
        </div>
      </ManagementCard>

      <FeedComposerClient
        boothName={booth.name ?? "이름 없는 부스"}
        boothLocation={booth.location}
        bodyMaxLength={POST_BODY_MAX_LENGTH}
        imageMaxBytes={POST_IMAGE_MAX_BYTES}
      />
    </main>
  );
}

function MissingBoothState() {
  return (
    <main
      id="main-content"
      className="m-auto flex max-w-md flex-col gap-4 px-4 py-12 text-center"
      aria-labelledby="missing-booth-heading"
    >
      <ManagementCard as="section" className="space-y-4">
        <ManagementEyebrow className="text-primary">FEED</ManagementEyebrow>
        <h1
          id="missing-booth-heading"
          className="text-3xl font-semibold text-foreground"
        >
          부스 정보를 찾을 수 없어요
        </h1>
        <p className="text-sm text-soft">
          현재 계정에는 연결된 부스가 없습니다. 관리자에게 문의하여 부스를 연결한 뒤 다시 시도해주세요.
        </p>
      </ManagementCard>
    </main>
  );
}
