import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { PostNotFoundError } from "@/lib/posts/errors";
import { togglePostHeart } from "@/lib/posts/hearts";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정만 하트를 남길 수 있습니다." },
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
    const result = await togglePostHeart({
      postId,
      userId: session.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PostNotFoundError) {
      return NextResponse.json(
        { message: "게시글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "하트를 처리하지 못했습니다." },
      { status: 500 },
    );
  }
}
