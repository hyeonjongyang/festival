const relativeFormatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = Date.now();
  const diff = date.getTime() - now;
  const minutes = Math.round(diff / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return relativeFormatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return relativeFormatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return relativeFormatter.format(days, "day");
}

export function formatCompactDate(dateString: string) {
  return dateFormatter.format(new Date(dateString));
}
