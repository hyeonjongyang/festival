import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fetchStudentDashboard } from "@/lib/students/dashboard";
import { StudentDashboardClient } from "./student-dashboard-client";

export default async function StudentPage() {
  const session = await getSessionUser();

  if (!session || session.role !== "STUDENT") {
    redirect("/");
  }

  const dashboard = await fetchStudentDashboard(session.id);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8"
      aria-labelledby="student-dashboard-heading"
    >
      <header className="glass-panel p-6 text-center">
        <h1
          id="student-dashboard-heading"
          className="text-2xl font-semibold text-white"
        >
          마이페이지
        </h1>
      </header>

      <StudentDashboardClient initialData={dashboard} />
    </main>
  );
}
