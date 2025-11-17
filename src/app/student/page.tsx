import { requireRole } from "@/lib/auth/require-role";
import { fetchStudentDashboard } from "@/lib/students/dashboard";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function StudentPage() {
  const session = await requireRole(["STUDENT"]);
  const student = await fetchStudentDashboard(session.id);

  return (
    <div className="space-y-6 pb-28">
      <StudentDashboard initial={student} />
      <div className="pt-4">
        <LogoutButton intent="danger" label="로그아웃" helperText={null} />
      </div>
    </div>
  );
}
