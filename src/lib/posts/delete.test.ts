import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { deletePost } from "@/lib/posts/delete";
import {
  PostDeleteForbiddenError,
  PostNotFoundError,
} from "@/lib/posts/errors";

const prismaMocks = vi.hoisted(() => {
  return {
    post: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const rmMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => {
  return {
    rm: rmMock,
  };
});

vi.mock("@/lib/prisma", () => {
  const { post } = prismaMocks;
  return {
    prisma: {
      post,
    },
  };
});

const postQueries = prismaMocks.post;

beforeEach(() => {
  vi.clearAllMocks();

  postQueries.findUnique.mockResolvedValue({
    id: "post_1",
    authorId: "user_1",
    imagePath: "/uploads/posts/post_1/image.jpg",
  });
  postQueries.delete.mockResolvedValue(undefined);
  rmMock.mockResolvedValue(undefined);
});

describe("deletePost", () => {
  it("removes the post and related assets when the author deletes it", async () => {
    await deletePost({
      postId: "post_1",
      requesterId: "user_1",
      requesterRole: UserRole.BOOTH_MANAGER,
    });

    expect(postQueries.delete).toHaveBeenCalledWith({
      where: { id: "post_1" },
    });
    expect(rmMock).toHaveBeenCalledWith(
      path.join(process.cwd(), "uploads/posts/post_1"),
      { recursive: true, force: true },
    );
    expect(rmMock).toHaveBeenCalledWith(
      path.join(process.cwd(), "public", "uploads/posts/post_1"),
      { recursive: true, force: true },
    );
  });

  it("allows admins to delete posts they do not own", async () => {
    postQueries.findUnique.mockResolvedValue({
      id: "post_2",
      authorId: "owner_id",
      imagePath: "/uploads/posts/post_2/image.png",
    });

    await deletePost({
      postId: "post_2",
      requesterId: "admin_id",
      requesterRole: UserRole.ADMIN,
    });

    expect(postQueries.delete).toHaveBeenCalledWith({
      where: { id: "post_2" },
    });
  });

  it("throws when the requester is neither the author nor an admin", async () => {
    await expect(
      deletePost({
        postId: "post_1",
        requesterId: "intruder",
      requesterRole: UserRole.BOOTH_MANAGER,
    }),
  ).rejects.toBeInstanceOf(PostDeleteForbiddenError);

    expect(postQueries.delete).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it("throws when the post does not exist", async () => {
    postQueries.findUnique.mockResolvedValue(null);

    await expect(
      deletePost({
        postId: "missing",
        requesterId: "user_1",
        requesterRole: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(PostNotFoundError);
  });

  it("skips image cleanup when the post has no image", async () => {
    postQueries.findUnique.mockResolvedValue({
      id: "post_3",
      authorId: "user_3",
      imagePath: null,
    });

    await deletePost({
      postId: "post_3",
      requesterId: "user_3",
      requesterRole: UserRole.BOOTH_MANAGER,
    });

    expect(rmMock).not.toHaveBeenCalled();
  });
});
