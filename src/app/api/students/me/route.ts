import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchStudentDashboard } from "@/lib/students/dashboard";
import { StudentAccessError } from "@/lib/students/errors";

export async function GET() {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    return NextResponse.json(
      { message: "학생 계정만 접근할 수 있습니다." },
      { status: 401 },
    );
  }

  try {
    const student = await fetchStudentDashboard(session.id);
    return NextResponse.json({ student });
  } catch (error) {
    if (error instanceof StudentAccessError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { message: "학생 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
