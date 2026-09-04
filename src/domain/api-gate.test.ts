import { describe, expect, it } from "vitest";
import { evaluateApiGate, isBlockedUserAgent, IpRateLimiter, type GateHeaders } from "./api-gate";

const browserFetch: GateHeaders = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  secFetchMode: "cors",
  secFetchDest: "empty",
  secFetchSite: "same-origin",
};

const bare = (userAgent: string): GateHeaders => ({ userAgent, secFetchMode: "", secFetchDest: "", secFetchSite: "" });

describe("api gate user-agent filter", () => {
  it("blocks known tooling and crawler agents", () => {
    for (const ua of [
      "curl/8.4.0",
      "Wget/1.21",
      "python-requests/2.31",
      "python-urllib/3.11",
      "Scrapy/2.11 (+https://scrapy.org)",
      "Go-http-client/2.0",
      "okhttp/4.12",
      "node-fetch/3.3",
      "axios/1.7",
      "Googlebot/2.1",
      "SomeCrawler/1.0",
      "HeadlessChrome/126",
      "node",
      "Node.js/22",
      "undici",
      "deno/1.45",
      "bun/1.1",
      "PostmanRuntime/7.39",
    ]) {
      expect(isBlockedUserAgent(ua), ua).toBe(true);
    }
  });

  it("does not block ordinary browser agents", () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; rv:127.0) Gecko/20100101 Firefox/127.0",
    ]) {
      expect(isBlockedUserAgent(ua), ua).toBe(false);
    }
  });

  it("blocks an empty user agent", () => {
    expect(isBlockedUserAgent("")).toBe(true);
    expect(isBlockedUserAgent("   ")).toBe(true);
  });
});

describe("evaluateApiGate", () => {
  it("passes a real browser fetch", () => {
    expect(evaluateApiGate(browserFetch)).toEqual({ block: false });
  });

  it("passes an old browser without Fetch Metadata (browser UA alone suffices)", () => {
    expect(evaluateApiGate(bare("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"))).toEqual({ block: false });
  });

  it("blocks curl and friends outright", () => {
    expect(evaluateApiGate(bare("curl/8.4.0"))).toEqual({ block: true, reason: "user-agent" });
  });

  it("blocks unidentified clients with no browser signals", () => {
    expect(evaluateApiGate(bare("some-library/2.1"))).toEqual({ block: true, reason: "no-browser-signals" });
    expect(evaluateApiGate(bare(""))).toEqual({ block: true, reason: "user-agent" });
  });

  it("passes unusual-but-fetch-metadata clients", () => {
    expect(evaluateApiGate({ ...bare("MyCompanyAgent/1.0"), secFetchMode: "cors", secFetchDest: "empty", secFetchSite: "same-origin" })).toEqual({ block: false });
  });
});

describe("IpRateLimiter", () => {
  it("allows a burst up to capacity then rejects until refill", () => {
    const limiter = new IpRateLimiter(5, 60);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i += 1) expect(limiter.take("1.2.3.4", t0)).toBe(true);
    expect(limiter.take("1.2.3.4", t0)).toBe(false);
    expect(limiter.take("1.2.3.4", t0 + 61_000)).toBe(true);
  });

  it("tracks ips independently", () => {
    const limiter = new IpRateLimiter(1, 60);
    const t0 = 1_000_000;
    expect(limiter.take("1.1.1.1", t0)).toBe(true);
    expect(limiter.take("2.2.2.2", t0)).toBe(true);
    expect(limiter.take("1.1.1.1", t0)).toBe(false);
  });
});
