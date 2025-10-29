import { prisma } from "@/lib/prisma";
import { PostNotFoundError } from "@/lib/posts/errors";

export type ToggleHeartResult = {
  hearted: boolean;
  totalHearts: number;
};

export async function togglePostHeart(params: {
  postId: string;
  userId: string;
}): Promise<ToggleHeartResult> {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: params.postId },
      select: { id: true },
    });

    if (!post) {
      throw new PostNotFoundError();
    }

    const existing = await tx.heart.findUnique({
      where: {
        postId_userId: {
          postId: params.postId,
          userId: params.userId,
        },
      },
      select: { id: true },
    });

    let hearted = false;

    if (existing) {
      await tx.heart.delete({
        where: {
          postId_userId: {
            postId: params.postId,
            userId: params.userId,
          },
        },
      });
      hearted = false;
    } else {
      await tx.heart.create({
        data: {
          postId: params.postId,
          userId: params.userId,
        },
      });
      hearted = true;
    }

    const totalHearts = await tx.heart.count({
      where: { postId: params.postId },
    });

    return {
      hearted,
      totalHearts,
    };
  });
}
