import { redirect } from "next/navigation";
import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { BoothAccessError } from "@/lib/points/errors";
import {
  fetchBoothPointsDashboard,
  type BoothPointsDashboard,
} from "@/lib/points/dashboard";
import { BoothPointsClient } from "./points-client";

export default async function BoothPointsPage() {
  const session = await getSessionUser();

  if (!session || session.role === "STUDENT") {
    redirect("/");
  }

  let dashboard: BoothPointsDashboard | null = null;

  try {
    dashboard = await fetchBoothPointsDashboard(session.id);
  } catch (error) {
    if (error instanceof BoothAccessError) {
      return <MissingBoothState />;
    }

    throw error;
  }

  return <BoothPointsClient initialData={dashboard} />;
}

function MissingBoothState() {
  return (
    <div className="m-auto flex max-w-md flex-col gap-4 px-4 py-12 text-center">
      <ManagementCard as="section" className="space-y-4">
        <ManagementEyebrow className="text-primary">BOOTH</ManagementEyebrow>
        <h1 className="text-3xl font-semibold text-foreground">
          부스가 연결되지 않았어요
        </h1>
        <p className="text-sm text-soft">
          현재 계정에는 부스 정보가 없습니다. 관리자에게 문의해 부스를 생성하고 이 페이지를 다시 열어주세요.
        </p>
      </ManagementCard>
    </div>
  );
}
