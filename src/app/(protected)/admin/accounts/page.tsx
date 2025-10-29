import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import type { AccountBatchPayload } from "@/lib/accounts/types";
import { prisma } from "@/lib/prisma";
import {
  AdminAccountsForm,
  BoothAccountsForm,
  StudentBatchForm,
} from "./client-forms";

const createdAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminAccountsPage() {
  const recentBatches = await prisma.accountBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      kind: true,
      payload: true,
      createdAt: true,
      createdBy: true,
      xlsxPath: true,
    },
  });

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8"
      aria-labelledby="admin-accounts-heading"
    >
      <ManagementCard as="header" className="space-y-4">
        <ManagementEyebrow className="text-primary">ADMIN</ManagementEyebrow>
        <h1 id="admin-accounts-heading" className="text-3xl font-semibold text-foreground">
          계정 발급 허브
        </h1>
        <p className="text-sm text-muted">
          학생 · 부스 관리자 · 전체 관리자 계정을 세션별 워크플로우에 맞게 일괄로 생성하고, Excel 내보내기와 기록을 한 곳에서 관리합니다.
        </p>
      </ManagementCard>

      <StudentBatchForm />
      <BoothAccountsForm />
      <AdminAccountsForm />

      <BatchHistory batches={recentBatches} />
    </main>
  );
}

type BatchItem = Awaited<ReturnType<typeof prisma.accountBatch.findMany>>[number];

type BatchDisplay = {
  title: string;
  detail: string;
  preview?: string[];
};

function BatchHistory({ batches }: { batches: BatchItem[] }) {
  return (
    <ManagementCard className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <ManagementEyebrow>HISTORY</ManagementEyebrow>
          <h2 className="mt-2 text-xl font-semibold text-foreground">최근 생성 내역</h2>
        </div>
      </header>

      {batches.length === 0 ? (
        <p className="text-sm text-soft">
          아직 생성된 계정 배치가 없습니다. 첫 학생 배치를 생성하면 이곳에 기록됩니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {batches.map((batch) => {
            const payload = parsePayload(batch.payload);
            const display = payload ? describePayload(payload) : null;

            return (
              <li
                key={batch.id}
                className="rounded-2xl border border-border bg-background/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="font-semibold text-foreground">
                    {display?.title ?? `배치 ${batch.id.slice(0, 5)}`}
                  </p>
                  <span className="text-xs text-muted">
                    {createdAtFormatter.format(batch.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-soft">
                  {display?.detail ?? "요약을 불러올 수 없습니다."}
                </p>

                {display?.preview && display.preview.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-soft">
                    {display.preview.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border px-3 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}

                {batch.xlsxPath ? (
                  <a
                    href={batch.xlsxPath}
                    download
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                  >
                    Excel 다시 받기
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ManagementCard>
  );
}

function parsePayload(payload: unknown): AccountBatchPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const kind = (payload as Record<string, unknown>).kind;

  if (kind !== "student" && kind !== "booth" && kind !== "admin") {
    return null;
  }

  return payload as AccountBatchPayload;
}

function describePayload(payload: AccountBatchPayload): BatchDisplay {
  switch (payload.kind) {
    case "student": {
      const { gradeFrom, gradeTo, classCount, studentsPerClass } = payload.params;
      return {
        title: `학생 ${payload.result.total.toLocaleString()}명`,
        detail: `${gradeFrom}~${gradeTo}학년 · 학년별 ${classCount}반 · 반당 ${studentsPerClass}명`,
        preview: payload.result.preview.map(
          (student) =>
            `${student.grade}학년 ${student.classNumber}반 ${student.studentNumber}번 · ${student.code}`,
        ),
      };
    }
    case "booth":
      return {
        title: `부스 관리자 ${payload.result.total}명`,
        detail: `${payload.params.baseName} / ${payload.params.count}개 생성`,
        preview: payload.result.booths.map(
          (booth) => `${booth.boothName} · ${booth.code}`,
        ),
      };
    case "admin":
      return {
        title: `전체 관리자 ${payload.result.total}명`,
        detail: `${payload.params.label} / ${payload.params.count}개 생성`,
        preview: payload.result.admins.map(
          (admin) => `${admin.label} · ${admin.code}`,
        ),
      };
  }
}
