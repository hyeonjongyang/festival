import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";

type RoleArray = Readonly<UserRole[]>;

export async function requireRole(roles: RoleArray) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
