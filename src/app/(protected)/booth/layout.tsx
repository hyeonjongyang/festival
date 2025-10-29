import { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = ["BOOTH_MANAGER", "ADMIN"];

export default async function BoothLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(ALLOWED_ROLES);
  return <>{children}</>;
}
