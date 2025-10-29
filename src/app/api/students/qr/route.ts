import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { rotateStudentQrToken } from "@/lib/students/qr";
import { StudentAccessError } from "@/lib/students/errors";

export async function POST() {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정만 접근할 수 있습니다." },
      { status: 401 },
    );
  }

  try {
    const qrToken = await rotateStudentQrToken(session.id);
    return NextResponse.json({ qrToken });
  } catch (error) {
    if (error instanceof StudentAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { message: "QR 코드를 갱신하지 못했습니다." },
      { status: 500 },
    );
  }
}
