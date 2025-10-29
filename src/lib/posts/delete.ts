import { rm } from "node:fs/promises";
import path from "node:path";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PostNotFoundError, PostDeleteForbiddenError } from "@/lib/posts/errors";

type DeletePostParams = {
  postId: string;
  requesterId: string;
  requesterRole: UserRole;
};

export async function deletePost(params: DeletePostParams) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: {
      id: true,
      authorId: true,
      imagePath: true,
    },
  });

  if (!post) {
    throw new PostNotFoundError();
  }

  const isAuthor = post.authorId === params.requesterId;
  const isAdmin = params.requesterRole === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw new PostDeleteForbiddenError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.heart.deleteMany({
      where: { postId: params.postId },
    });

    await tx.post.delete({
      where: { id: params.postId },
    });
  });

  await removePostAssets(post.imagePath);
}

async function removePostAssets(imagePath: string | null | undefined) {
  if (!imagePath) {
    return;
  }

  const normalized = imagePath.startsWith("/")
    ? imagePath.slice(1)
    : imagePath;
  const absoluteDir = path.join(
    process.cwd(),
    "public",
    path.dirname(normalized),
  );

  try {
    await rm(absoluteDir, { recursive: true, force: true });
  } catch (error) {
    console.error("게시글 이미지 정리에 실패했습니다.", error);
  }
}
