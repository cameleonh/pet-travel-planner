// Anti-scrape gate for the JSON APIs. Browsers always send Fetch Metadata
// (Sec-Fetch-*) on fetch()/navigation since ~2020-2023; plain HTTP tooling
// (curl, python-requests, scrapy, raw node) sends neither those nor a
// convincing browser UA. Determined scrapers can spoof everything — this
// stops the lazy majority cheaply without breaking real browsers (an old
// browser UA alone still passes).

export type GateHeaders = {
  userAgent: string;
  secFetchMode: string;
  secFetchDest: string;
  secFetchSite: string;
};

const BLOCKED_UA_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /httpx/i,
  /scrapy/i,
  /go-http-client/i,
  /java\/[\d.]+/i,
  /okhttp/i,
  /apache-httpclient/i,
  /node-fetch/i,
  /axios/i,
  /libwww/i,
  /perl/i,
  /ruby/i,
  /bot/i,
  /spider/i,
  /crawler/i,
  /scrape/i,
  /headlesschrome/i,
];

const BROWSER_UA_PATTERNS = [
  /Mozilla\/5\.0 \(.*Chrome\/\d+/i,
  /Mozilla\/5\.0 \(.*AppleWebKit.*Safari/i,
  /Mozilla\/5\.0 \(.*Gecko\/\d+ Firefox\/\d+/i,
];

export function isBlockedUserAgent(userAgent: string): boolean {
  if (!userAgent.trim()) return true;
  return BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function looksLikeBrowser(headers: GateHeaders): boolean {
  if (BROWSER_UA_PATTERNS.some((pattern) => pattern.test(headers.userAgent))) return true;
  // Fetch Metadata presence implies a modern browser even for unusual UAs.
  return headers.secFetchMode.trim() !== "";
}

function hasFetchMetadata(headers: GateHeaders): boolean {
  return headers.secFetchMode.trim() !== "" || headers.secFetchDest.trim() !== "" || headers.secFetchSite.trim() !== "";
}

export type GateVerdict = { block: false } | { block: true; reason: "user-agent" | "no-browser-signals" };

export function evaluateApiGate(headers: GateHeaders): GateVerdict {
  if (isBlockedUserAgent(headers.userAgent)) return { block: true, reason: "user-agent" };
  if (!hasFetchMetadata(headers) && !looksLikeBrowser(headers)) {
    return { block: true, reason: "no-browser-signals" };
  }
  return { block: false };
}

// Per-IP token bucket. Intentionally in-memory: it survives long enough to
// blunt bulk dumping between deploys and asks nothing of the small instance.
export class IpRateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerMinute: number,
  ) {}

  take(ip: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(ip) ?? { tokens: this.capacity, updatedAt: now };
    const elapsedMinutes = Math.max(0, now - bucket.updatedAt) / 60_000;
    const tokens = Math.min(this.capacity, bucket.tokens + elapsedMinutes * this.refillPerMinute);
    if (tokens < 1) {
      this.buckets.set(ip, { tokens, updatedAt: now });
      if (this.buckets.size > 10_000) this.prune(now);
      return false;
    }
    this.buckets.set(ip, { tokens: tokens - 1, updatedAt: now });
    if (this.buckets.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    const staleCutoff = now - 60 * 60_000;
    for (const [ip, bucket] of this.buckets) {
      if (bucket.updatedAt < staleCutoff) this.buckets.delete(ip);
    }
  }
}
