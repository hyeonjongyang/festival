import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { isBoothRegistrationOpen } from "@/lib/features/booth-registration";
import { StudentBatchForm, BoothAccountsForm, AdminAccountsForm, BoothRegistrationToggle } from "@/components/admin/accounts-forms";
import type { AccountBatchPayload } from "@/types/api";

const createdAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminAccountsPage() {
  await requireRole(["ADMIN"]);
  const [recentBatches, registrationOpen] = await Promise.all([
    prisma.accountBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        kind: true,
        payload: true,
        createdAt: true,
        xlsxPath: true,
      },
    }),
    isBoothRegistrationOpen(),
  ]);

  return (
    <div className="space-y-6">
      <BoothRegistrationToggle initialEnabled={registrationOpen} />
      <StudentBatchForm />
      <BoothAccountsForm />
      <AdminAccountsForm />

      <BatchHistory batches={recentBatches} />
    </div>
  );
}

type BatchItem = Awaited<ReturnType<typeof prisma.accountBatch.findMany>>[number];

function BatchHistory({ batches }: { batches: BatchItem[] }) {
  return (
    <section className="p-5 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="chip inline-flex">기록</p>
          <h2 className="mt-2 text-2xl font-semibold">최근 생성 내역</h2>
        </div>
      </header>
      {batches.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">아직 생성된 배치가 없습니다.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {batches.map((batch) => {
            const display = describePayload(batch.payload as AccountBatchPayload | null);
            return (
              <li key={batch.id} className="rounded-2xl border border-[var(--outline)] px-4 py-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{createdAtFormatter.format(batch.createdAt)}</span>
                  <span>{batch.kind}</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{display.title}</p>
                <p className="text-sm text-[var(--text-muted)]">{display.detail}</p>
                {display.preview?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    {display.preview.map((item) => (
                      <span key={item} className="rounded-full border border-[var(--outline)] px-3 py-1">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
                {batch.xlsxPath ? (
                  <a href={batch.xlsxPath} className="mt-3 inline-flex text-xs text-[var(--accent)]">
                    Excel 다시 받기
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function describePayload(payload: AccountBatchPayload | null): {
  title: string;
  detail: string;
  preview?: string[];
} {
  if (!payload) {
    return { title: "알 수 없는 배치", detail: "요약을 불러오지 못했습니다." };
  }

  switch (payload.kind) {
    case "student":
      return {
        title: `학생 ${payload.result.total.toLocaleString()}명`,
        detail: `${payload.params.gradeFrom}~${payload.params.gradeTo}학년 / 학년별 ${payload.params.classCount}반 / 반당 ${payload.params.studentsPerClass}명`,
        preview: payload.result.preview.map(
          (student) =>
            `${student.grade}학년 ${student.classNumber}반 ${student.studentNumber}번 · ${student.code}`,
        ),
      };
    case "booth":
      return {
        title: `부스 관리자 ${payload.result.total}명`,
        detail: `${payload.params.baseName} 기준 ${payload.params.count}개`,
        preview: payload.result.booths.map((booth) => `${booth.boothName} · ${booth.code}`),
      };
    case "admin":
      return {
        title: `전체 관리자 ${payload.result.total}명`,
        detail: `${payload.params.label} · ${payload.params.count}개`,
        preview: payload.result.admins.map((admin) => `${admin.label} · ${admin.code}`),
      };
  }
}
