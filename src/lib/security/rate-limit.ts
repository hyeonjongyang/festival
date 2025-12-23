type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

declare global {
  var festivalRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getStore() {
  if (!globalThis.festivalRateLimitStore) {
    globalThis.festivalRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalThis.festivalRateLimitStore;
}

export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetAtMs: number;
    }
  | {
      allowed: false;
      remaining: 0;
      resetAtMs: number;
      retryAfterSeconds: number;
    };

export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = params.nowMs ?? Date.now();
  const store = getStore();

  if (store.size > 10_000) {
    for (const [key, entry] of store) {
      if (entry.resetAtMs <= nowMs) {
        store.delete(key);
      }
    }
  }

  const current = store.get(params.key);

  if (!current || current.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + params.windowMs;
    store.set(params.key, { count: 1, resetAtMs });
    return { allowed: true, remaining: Math.max(params.limit - 1, 0), resetAtMs };
  }

  if (current.count >= params.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAtMs - nowMs) / 1000),
    );
    return { allowed: false, remaining: 0, resetAtMs: current.resetAtMs, retryAfterSeconds };
  }

  current.count += 1;
  store.set(params.key, current);

  return {
    allowed: true,
    remaining: Math.max(params.limit - current.count, 0),
    resetAtMs: current.resetAtMs,
  };
}

export function getRequestIp(request: Request) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  return "unknown";
}
