import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      nickname: true,
      nicknameLocked: true,
      grade: true,
      classNumber: true,
      studentNumber: true,
      points: true,
      code: true,
    },
  });

  return user;
}

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;
