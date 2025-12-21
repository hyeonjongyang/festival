import { requireRole } from "@/lib/auth/require-role";
import { fetchStudentDashboard } from "@/lib/students/dashboard";
import { StudentDashboard } from "@/components/student/student-dashboard";

export default async function StudentPage() {
  const session = await requireRole(["STUDENT"]);
  const student = await fetchStudentDashboard(session.id);

  return (
    <div className="space-y-6 pb-28">
      <StudentDashboard initial={student} variant="recent" />
    </div>
  );
}
