import { expect, test } from "@playwright/test";

test("API rejects malformed and duplicate condition queries with a safe envelope", async ({ request }) => {
  for (const conditions of ["not-a-condition", "leash,leash"]) {
    const response = await request.get(`/api/places?conditions=${conditions}`);
    expect(response.status()).toBe(400);
    expect(response.headers()["content-language"]).toBe("ko");
    expect(response.headers()["x-request-id"]).toBeTruthy();
    const body = await response.json();
    expect(body).toMatchObject({ success: false, data: null, error: { code: "INVALID_QUERY" } });
    expect(JSON.stringify(body)).not.toContain("ZodError");
    expect(JSON.stringify(body)).not.toContain("stack");
  }
});

test("application responses expose the locked security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["permissions-policy"]).toContain("microphone=()");
});

test("catalog API returns global metadata with a bounded result page", async ({ request }) => {
  const response = await request.get("/api/places?page=1");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, max-age=60, stale-while-revalidate=300");
  const body = await response.json();
  expect(body.data.catalog).toMatchObject({ sourceTotalCount: 2, searchableCount: 2, filteredCount: 2, confirmedMatchCount: 0, confirmedNonMatchCount: 0, unverifiedCount: 0, page: 1, pageSize: 50, totalPages: 1 });
  expect(body.data.catalog.results).toHaveLength(2);
  expect(body.data.places).toBeUndefined();
});

test("desktop filter row does not overlap the full-width nearby and course row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const filter = page.locator(".filter-panel");
  const extensions = page.locator(".extensions");
  await extensions.scrollIntoViewIfNeeded();
  const filterBox = await filter.boundingBox();
  const extensionBox = await extensions.boundingBox();
  expect(filterBox).not.toBeNull();
  expect(extensionBox).not.toBeNull();
  expect((filterBox?.y ?? 0) + (filterBox?.height ?? 0)).toBeLessThanOrEqual(extensionBox?.y ?? 0);
});
