const relativeFormatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getUnitDiff(diffMs: number, unitMs: number) {
  const raw = diffMs / unitMs;
  return diffMs >= 0 ? Math.floor(raw) : Math.ceil(raw);
}

export function formatRelativeTime(dateString: string, nowMs: number = Date.now()) {
  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMs = timestamp - nowMs;
  const absMs = Math.abs(diffMs);

  if (absMs < 1000) {
    return "방금 전";
  }

  if (absMs < 60_000) {
    const seconds = getUnitDiff(diffMs, 1000);
    return relativeFormatter.format(seconds, "second");
  }

  const minutes = getUnitDiff(diffMs, 1000 * 60);

  if (Math.abs(minutes) < 60) {
    return relativeFormatter.format(minutes, "minute");
  }

  const hours = getUnitDiff(diffMs, 1000 * 60 * 60);

  if (Math.abs(hours) < 24) {
    return relativeFormatter.format(hours, "hour");
  }

  const days = getUnitDiff(diffMs, 1000 * 60 * 60 * 24);
  return relativeFormatter.format(days, "day");
}

export function formatCompactDate(dateString: string) {
  return dateFormatter.format(new Date(dateString));
}
