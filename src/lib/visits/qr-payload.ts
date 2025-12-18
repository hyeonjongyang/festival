const BOOTH_VISIT_PATH = "/feed";
const BOOTH_VISIT_QUERY_KEY = "boothToken";

export function createBoothVisitUrl(origin: string, boothToken: string) {
  const token = sanitizeValue(boothToken);
  if (!token) return "";

  const url = new URL(BOOTH_VISIT_PATH, origin);
  url.searchParams.set(BOOTH_VISIT_QUERY_KEY, token);
  return url.toString();
}

export function extractBoothTokenFromQrPayload(payload: string) {
  const trimmed = sanitizeValue(payload);
  if (!trimmed) return "";

  const looksLikeAbsoluteUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const looksLikePath = trimmed.startsWith("/");

  if (!looksLikeAbsoluteUrl && !looksLikePath) {
    return trimmed;
  }

  let url: URL;

  try {
    url = looksLikePath ? new URL(trimmed, "https://festival.local") : new URL(trimmed);
  } catch {
    return trimmed;
  }

  const fromSearch =
    url.searchParams.get("boothToken") ??
    url.searchParams.get("token") ??
    url.searchParams.get("booth") ??
    url.searchParams.get("t");

  if (fromSearch) {
    return sanitizeValue(fromSearch);
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  const match =
    pathname.match(/^\/v\/([^/]+)/) ??
    pathname.match(/^\/visit\/([^/]+)/);

  if (!match?.[1]) {
    return trimmed;
  }

  try {
    return sanitizeValue(decodeURIComponent(match[1]));
  } catch {
    return sanitizeValue(match[1]);
  }
}

function sanitizeValue(value: string) {
  if (typeof value !== "string") return "";
  return value.trim();
}
