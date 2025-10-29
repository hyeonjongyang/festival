import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { StudentAccessError } from "@/lib/students/errors";

export function generateQrToken() {
  return randomUUID();
}

export async function rotateStudentQrToken(userId: string) {
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!student || student.role !== "STUDENT") {
    throw new StudentAccessError();
  }

  const newToken = generateQrToken();

  const updated = await prisma.user.update({
    where: { id: student.id },
    data: { qrToken: newToken },
    select: { qrToken: true },
  });

  return updated.qrToken;
}
