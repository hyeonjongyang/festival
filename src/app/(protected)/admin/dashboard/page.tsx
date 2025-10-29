import { ManagementCard, ManagementEyebrow } from "@/components/management/management-card";
import { fetchAdminDashboard } from "@/lib/admin/dashboard";
import { ADMIN_ACTIVE_BOOTH_WINDOW_HOURS } from "@/lib/config/constants";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminDashboardPage() {
  const dashboard = await fetchAdminDashboard();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-9">
      <ManagementCard as="header" className="space-y-4">
        <ManagementEyebrow className="text-primary">ADMIN</ManagementEyebrow>
        <h1 className="text-3xl font-semibold text-foreground">
          모니터링 대시보드
        </h1>
        <p className="text-sm text-muted">
          포인트 지급 현황과 커뮤니티 활동을 한눈에 확인하고, 위험 징후를 즉시 파악하세요.
        </p>
      </ManagementCard>

      <StatsCards
        totalAwards={dashboard.stats.totalAwards}
        totalPoints={dashboard.stats.totalPointsAwarded}
        activeBooths={dashboard.stats.activeBooths}
        totalPosts={dashboard.stats.totalPosts}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WarningsPanel warnings={dashboard.warnings} />
        <RecentPostsPanel posts={dashboard.recentPosts} />
      </div>

      <RecentPointLogsPanel logs={dashboard.recentPointLogs} />
    </div>
  );
}

function StatsCards(props: {
  totalAwards: number;
  totalPoints: number;
  activeBooths: number;
  totalPosts: number;
}) {
  const cards = [
    {
      label: "총 포인트 지급 횟수",
      value: numberFormatter.format(props.totalAwards),
      hint: `누적 지급 포인트 ${numberFormatter.format(props.totalPoints)}점`,
    },
    {
      label: "활성 부스",
      value: numberFormatter.format(props.activeBooths),
      hint: `${ADMIN_ACTIVE_BOOTH_WINDOW_HOURS}시간 이내 포인트 지급 이력`,
    },
    {
      label: "피드 게시글 수",
      value: numberFormatter.format(props.totalPosts),
      hint: "누적 작성된 피드 글",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <ManagementCard
          key={card.label}
          as="article"
          padding="sm"
          className="flex flex-col gap-3 bg-surface-alt"
        >
          <ManagementEyebrow>{card.label}</ManagementEyebrow>
          <p className="text-3xl font-semibold text-foreground">{card.value}</p>
          <p className="text-xs text-soft">{card.hint}</p>
        </ManagementCard>
      ))}
    </section>
  );
}

function WarningsPanel(props: {
  warnings: Awaited<ReturnType<typeof fetchAdminDashboard>>["warnings"];
}) {
  return (
    <ManagementCard className="flex h-full flex-col gap-4">
      <header>
        <ManagementEyebrow>WATCHLIST</ManagementEyebrow>
        <h2 className="mt-2 text-xl font-semibold text-foreground">위험 경고</h2>
        <p className="text-xs text-muted">
          30분 제한 위반 시도 등 잠재적 위험 징후를 감시합니다.
        </p>
      </header>

      {props.warnings.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-soft">
          현재 경고가 없습니다. 부스별 지급 활동을 지속적으로 모니터링합니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {props.warnings.map((warning) => (
            <li
              key={warning.id}
              className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {warning.boothName} → {warning.studentNickname}
                </p>
                <span className="text-xs text-soft">
                  {dateTimeFormatter.format(new Date(warning.detectedAt))}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground">{warning.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-soft">
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1">
                  {warning.studentLabel}
                </span>
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1">
                  재시도 가능 {dateTimeFormatter.format(new Date(warning.availableAt))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ManagementCard>
  );
}

function RecentPostsPanel(props: {
  posts: Awaited<ReturnType<typeof fetchAdminDashboard>>["recentPosts"];
}) {
  return (
    <ManagementCard className="flex h-full flex-col gap-4">
      <header>
        <ManagementEyebrow>FEED</ManagementEyebrow>
        <h2 className="mt-2 text-xl font-semibold text-foreground">최근 피드</h2>
        <p className="text-xs text-muted">
          방금 올라온 축제 피드를 빠르게 검토하세요.
        </p>
      </header>

      {props.posts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-soft">
          아직 게시된 피드가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {props.posts.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-border bg-background/70 p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {post.preview}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-soft">
                <span className="rounded-full border border-border px-2 py-1">
                  {post.boothName}
                </span>
                <span className="rounded-full border border-border px-2 py-1">
                  {post.authorNickname}
                </span>
                <span className="rounded-full border border-border px-2 py-1">
                  {dateTimeFormatter.format(new Date(post.createdAt))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ManagementCard>
  );
}

function RecentPointLogsPanel(props: {
  logs: Awaited<ReturnType<typeof fetchAdminDashboard>>["recentPointLogs"];
}) {
  return (
    <ManagementCard className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <ManagementEyebrow>POINTS</ManagementEyebrow>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            최근 포인트 지급
          </h2>
        </div>
      </header>

      {props.logs.length === 0 ? (
        <p className="text-sm text-soft">
          아직 포인트 지급 로그가 없습니다. 부스에서 QR을 스캔하면 이곳에 기록됩니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background/60">
          <table className="min-w-full divide-y divide-border text-left text-sm text-soft">
            <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold text-left">학생</th>
                <th className="px-4 py-3 font-semibold text-left">부스</th>
                <th className="px-4 py-3 font-semibold text-right">포인트</th>
                <th className="px-4 py-3 font-semibold text-left">지급 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/60">
              {props.logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {log.studentNickname}
                      </span>
                      <span className="text-xs text-muted">{log.studentLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-soft">{log.boothName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    {numberFormatter.format(log.points)}
                  </td>
                  <td className="px-4 py-3 text-soft">
                    {dateTimeFormatter.format(new Date(log.awardedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ManagementCard>
  );
}
