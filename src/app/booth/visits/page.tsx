import { requireRole } from "@/lib/auth/require-role";
import { fetchBoothVisitsDashboard } from "@/lib/visits/dashboard";
import { BoothAccessError } from "@/lib/visits/errors";
import { BoothDashboard } from "@/components/booth/booth-dashboard";
import { headers } from "next/headers";

export default async function BoothVisitsPage() {
  const session = await requireRole(["BOOTH_MANAGER", "ADMIN"]);
  const headerList = await headers();
  const rawHost = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const rawProto = headerList.get("x-forwarded-proto") ?? "";
  const host = rawHost.split(",")[0]?.trim();
  const proto = (rawProto.split(",")[0]?.trim() || (host?.includes("localhost") ? "http" : "https")) as
    | "http"
    | "https";
  const origin = host ? `${proto}://${host}` : "";

  let dashboard = null;
  let missingBooth = false;

  try {
    dashboard = await fetchBoothVisitsDashboard(session.id);
  } catch (error) {
    if (error instanceof BoothAccessError) {
      missingBooth = true;
    } else {
      throw error;
    }
  }

  if (missingBooth || !dashboard) {
    return (
      <div className="space-y-6">
        <section className="p-6 text-sm text-[var(--text-muted)]">
          연결된 부스를 찾을 수 없습니다. 관리자에게 부스 권한을 요청하세요.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BoothDashboard initial={dashboard} origin={origin} />
    </div>
  );
}
