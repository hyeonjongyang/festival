import { requireRole } from "@/lib/auth/require-role";
import { fetchAdminDashboard } from "@/lib/admin/dashboard";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  const dashboard = await fetchAdminDashboard();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
        <StatCard label="누적 방문" value={dashboard.stats.totalVisits.toLocaleString()} />
        <StatCard label="고유 방문자" value={dashboard.stats.uniqueVisitors.toLocaleString()} />
        <StatCard label="활성 부스" value={dashboard.stats.activeBooths.toLocaleString()} />
        <StatCard label="피드 수" value={dashboard.stats.totalPosts.toLocaleString()} />
      </div>

      <section className="p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">최근 게시글</h2>
          <span className="text-xs text-[var(--text-muted)]">{dashboard.recentPosts.length}건</span>
        </header>
        {dashboard.recentPosts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">최근 게시글이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dashboard.recentPosts.map((post) => (
              <li key={post.id} className="rounded-2xl border border-[var(--outline)] px-4 py-3 text-sm">
                <p className="font-semibold text-[var(--text-primary)]">{post.boothName}</p>
                <p className="text-xs text-[var(--text-muted)]">{post.authorName} · {dateFormat.format(new Date(post.createdAt))}</p>
                <p className="mt-1 text-[var(--text-muted)]">{post.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">최근 방문 기록</h2>
          <span className="text-xs text-[var(--text-muted)]">{dashboard.recentVisitLogs.length}건</span>
        </header>
        {dashboard.recentVisitLogs.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">최근 방문 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.recentVisitLogs.map((log) => (
              <li key={log.id} className="rounded-2xl border border-[var(--outline)] px-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{log.boothName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{log.studentIdentifier} · {log.studentLabel}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{dateFormat.format(new Date(log.visitedAt))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-5">
        <h2 className="text-xl font-semibold">운영 경고</h2>
        {dashboard.warnings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">최근 경고가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {dashboard.warnings.map((warning) => (
              <li key={warning.id} className="rounded-2xl border border-[var(--outline)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{warning.type}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{warning.boothName}</p>
                <p className="text-xs text-[var(--text-muted)]">{warning.studentIdentifier} · {warning.studentLabel}</p>
                <p className="mt-1 text-[var(--text-muted)]">{warning.summary}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  감지: {dateFormat.format(new Date(warning.detectedAt))} · 마지막 방문: {dateFormat.format(new Date(warning.lastVisitedAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--outline)] bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{value}</p>
    </div>
  );
}
