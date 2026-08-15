import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchKakaoLocal } from "@/app/api/_shared/kakao-local";

describe("fetchKakaoLocal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retries one transient upstream failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchKakaoLocal(
      new URL("https://dapi.kakao.com/v2/local/search/keyword.json?query=test"),
      "test-key",
      new AbortController().signal,
      { retryDelayMs: 0 },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a client error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchKakaoLocal(
      new URL("https://dapi.kakao.com/v2/local/search/keyword.json?query=test"),
      "test-key",
      new AbortController().signal,
      { retryDelayMs: 0 },
    );

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry after the caller aborts", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchKakaoLocal(
      new URL("https://dapi.kakao.com/v2/local/search/keyword.json?query=test"),
      "test-key",
      controller.signal,
      { retryDelayMs: 0 },
    )).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
