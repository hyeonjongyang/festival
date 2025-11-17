type JsonHeaders = HeadersInit | undefined;

export class HttpError<T = unknown> extends Error {
  status: number;
  data: T;

  constructor(message: string, status: number, data: T) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function buildHeaders(base: JsonHeaders, body?: BodyInit | null) {
  const headers = new Headers(base ?? undefined);
  headers.set("Accept", "application/json");
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init?.headers, init?.body),
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? (payload as { message?: string }).message ?? "요청을 처리하지 못했습니다."
      : "요청을 처리하지 못했습니다.";
    throw new HttpError(message, response.status, payload);
  }

  return payload as T;
}
