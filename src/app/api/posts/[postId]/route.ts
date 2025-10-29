import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { deletePost } from "@/lib/posts/delete";
import {
  PostDeleteForbiddenError,
  PostNotFoundError,
} from "@/lib/posts/errors";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { postId } = await context.params;

  if (!postId) {
    return NextResponse.json(
      { message: "게시글 ID가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    await deletePost({
      postId,
      requesterId: session.id,
      requesterRole: session.role,
    });

    return NextResponse.json(
      { message: "게시글을 삭제했습니다." },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PostNotFoundError) {
      return NextResponse.json(
        { message: "게시글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (error instanceof PostDeleteForbiddenError) {
      return NextResponse.json(
        { message: "게시글을 삭제할 권한이 없습니다." },
        { status: 403 },
      );
    }

    console.error("게시글을 삭제하지 못했습니다.", error);
    return NextResponse.json(
      { message: "게시글을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
