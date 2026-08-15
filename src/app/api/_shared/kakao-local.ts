type KakaoLocalFetchOptions = {
  timeoutMs?: number;
  retryDelayMs?: number;
  maxAttempts?: 1 | 2;
};

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      globalThis.clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

export async function fetchKakaoLocal(
  apiUrl: URL,
  apiKey: string,
  requestSignal: AbortSignal,
  options: KakaoLocalFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 7_000;
  const retryDelayMs = options.retryDelayMs ?? 180;
  const maxAttempts = options.maxAttempts ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(apiUrl.toString(), {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]),
        next: { revalidate: 300 },
      });
      const transientStatus = response.status === 429 || response.status >= 500;
      if (!transientStatus || attempt === maxAttempts - 1) return response;
    } catch (error) {
      if (requestSignal.aborted) throw error;
      lastError = error;
      if (attempt === maxAttempts - 1) throw error;
    }
    await waitForRetry(retryDelayMs, requestSignal);
  }

  throw lastError ?? new Error("Kakao Local request failed");
}
