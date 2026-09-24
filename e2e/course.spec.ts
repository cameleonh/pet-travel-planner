import { expect, test, type Page } from "@playwright/test";

async function finishNearbyReview(page: Page): Promise<void> {
  const nearby = page.locator(".nearby-disclosure");
  if (await nearby.getAttribute("open") === null) await nearby.locator("summary").click();
  await nearby.locator(".supplemental-review-button").click();
}

test("nearby catalog separates status and location denial falls back", async ({ page }) => {
  const nearbyServiceRequests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (["/api/veterinary", "/api/pet-shops", "/api/pet-restaurants"].includes(pathname)) nearbyServiceRequests.push(pathname);
  });
  await page.goto("/");
  await page.getByLabel("지역").selectOption("강원");
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await expect(page.getByRole("button", { name: "장소 선택 완료 · 추가 선택", exact: true })).toBeEnabled();
  await page.getByLabel("시·군·구").selectOption("강원 속초시");
  expect(nearbyServiceRequests).toEqual([]);
  await page.getByText("저장한 장소 주변", { exact: true }).click();
  await expect.poll(() => new Set(nearbyServiceRequests).size).toBe(3);
  const nearby = page.locator("section", {
    has: page.getByRole("heading", { name: "근처에 같이 들를 곳" }),
  });
  await expect(nearby.getByText("동반 확인")).toBeVisible();
  await expect(nearby.getByText("해오름 동물병원")).toBeVisible();
  await page.getByRole("button", { name: "해오름 동물병원 여행에 담기" }).click();
  await expect(page.getByRole("button", { name: "해오름 동물병원 여행에서 빼기" })).toHaveAttribute("aria-pressed", "true");
  await page.locator(".selection-complete-button").click();
  await expect(page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" }).getByRole("checkbox")).toHaveCount(2);
  await expect(nearby.getByText("청초호 반려산책구간")).toBeVisible();
  await expect(nearby.getByText("전화 확인 필요")).toBeVisible();
  await expect(nearby.getByText("바다생활박물관")).toBeVisible();
  await page.getByText("저장한 장소 주변", { exact: true }).click();
  await page.getByText("저장한 장소 주변", { exact: true }).click();
  await page.waitForTimeout(100);
  expect(nearbyServiceRequests).toHaveLength(3);
  await page.getByRole("button", { name: "내 위치로 보기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "위치 권한 없이" })).toBeVisible();
  await page.locator(".nearby-disclosure .supplemental-review-button").click();
  await expect(page.locator(".nearby-disclosure summary")).toContainText("확인 완료");
});

test("a failed nearby service can be retried without reopening the panel", async ({ page }) => {
  let veterinaryCalls = 0;
  await page.route("**/api/veterinary?*", async (route) => {
    veterinaryCalls += 1;
    if (veterinaryCalls === 1) {
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "일시 지연" } }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { hospitals: [{ id: "retry-vet", name: "재시도 동물병원", address: "강원특별자치도 속초시", roadAddress: null, phone: null, distance: 420, latitude: 38.2, longitude: 128.59, placeUrl: null }], count: 1 }, error: null }),
    });
  });
  for (const endpoint of ["pet-shops", "pet-restaurants"]) {
    await page.route(`**/api/${endpoint}?*`, async (route) => {
      const key = endpoint === "pet-shops" ? "shops" : "restaurants";
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { [key]: [], count: 0 }, error: null }) });
    });
  }

  await page.goto("/");
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.locator(".selection-complete-button").click();
  await page.locator(".nearby-disclosure > summary").click();
  const veterinaryGroup = page.locator(".nearby-services-grid > div", { has: page.getByRole("heading", { name: "동물병원" }) });
  await veterinaryGroup.getByRole("button", { name: "다시 불러오기" }).click();
  await expect(veterinaryGroup.getByText("재시도 동물병원")).toBeVisible();
  expect(veterinaryCalls).toBe(2);
});

test("course uses only places explicitly saved from browsing", async ({ page }) => {
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: null, error: { code: "NO_ROUTE", message: "경로를 찾을 수 없습니다." } }),
    });
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" })).toHaveCount(0);
  const addButtons = page.getByRole("button", { name: /여행에 담기/ });
  await addButtons.nth(0).click();
  await addButtons.nth(0).click();
  await page.locator(".selection-complete-button").click();
  const courseBuilder = page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" });
  await expect(courseBuilder.getByRole("checkbox")).toHaveCount(2);
  await expect(courseBuilder.getByRole("checkbox").nth(0)).toBeChecked();
  await expect(courseBuilder.getByRole("checkbox").nth(1)).toBeChecked();
  const reviewGuide = courseBuilder.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" });
  await expect(reviewGuide).toBeEnabled();
  await expect(page.locator(".nearby-disclosure")).not.toHaveAttribute("open", "");
  await courseBuilder.getByLabel("출발 장소").selectOption({ label: "파도끝 테라스" });
  await reviewGuide.click();
  const tripBoard = page.getByRole("dialog", { name: "03 · 내 여행 보드" });
  await expect(tripBoard.locator(".plan-place-list li").first()).toContainText("파도끝 테라스");
  await expect(tripBoard.locator(".plan-route-segment")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(courseBuilder.getByRole("status")).toContainText("코스를 여행 보드에 적용했어요");
  await expect(courseBuilder.locator(".course-result")).toHaveCount(0);
});

test("mobile trip drawer traps focus and restores it after Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.locator(".selection-complete-button").click();
  await finishNearbyReview(page);
  await page.getByRole("button", { name: /2곳 코스 만들기/ }).click();
  const dialog = page.getByRole("dialog", { name: "03 · 내 여행 보드" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".course-card .course-button")).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("mobile PDF alertdialog keeps the trip drawer open and traps focus", async ({ page }) => {
  const routeData = {
    summary: { distanceKm: 1, durationMinutes: 5, taxiFare: null, tollFee: null },
    congestion: { totalSegments: 1, smooth: 1, slow: 0, congested: 0, jammed: 0, hasCongestion: false },
    congestedRoads: [], mapLink: "https://map.kakao.com/", naviLink: "https://map.kakao.com/",
  };
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: routeData, error: null }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /여행에 담기/ }).nth(0).click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.locator(".selection-complete-button").click();
  await finishNearbyReview(page);
  await page.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();

  const drawer = page.getByRole("dialog", { name: "03 · 내 여행 보드" });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator(".plan-route-segment")).toHaveCount(1);
  const printButton = drawer.getByRole("button", { name: "계획서 인쇄 / PDF 저장" });
  await printButton.click();
  const printDialog = page.getByRole("alertdialog", { name: "여행 계획서가 준비됐어요" });
  await expect(printDialog).toBeVisible();

  await printDialog.getByRole("button", { name: "닫기" }).focus();
  await page.keyboard.press("Tab");
  expect(await printDialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(printDialog).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(printButton).toBeFocused();
});

test("desktop course confirmation follows the user to the travel plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const addButtons = page.getByRole("button", { name: /여행에 담기/ });
  await addButtons.nth(0).click();
  await addButtons.nth(0).click();
  await page.locator(".selection-complete-button").click();

  const courseBuilder = page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" });
  await courseBuilder.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();

  const plan = page.locator(".trip-board-plan");
  await expect(plan).toBeInViewport();
  await expect(plan).toBeFocused();
  await expect(page.locator(".show-more-results")).toHaveCount(0);
});

test("route provider failure falls back to a usable straight-line plan", async ({ page }) => {
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: null, error: { code: "NO_ROUTE", message: "경로를 찾을 수 없습니다." } }),
    });
  });
  await page.goto("/");
  const addButtons = page.getByRole("button", { name: /여행에 담기/ });
  await addButtons.nth(0).click();
  await addButtons.nth(0).click();
  await page.locator(".selection-complete-button").click();
  await finishNearbyReview(page);
  await page.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();
  await expect(page.locator(".plan-notice")).toContainText("직선거리");
  await expect(page.locator(".plan-route-segment")).toHaveCount(1);
  await expect(page.locator(".plan-route-segment")).toContainText("도로 경로 응답 지연");
  await expect(page.locator(".plan-visit-check")).toHaveCount(2);
  await expect(page.locator(".plan-visit-check").first()).toContainText("운영시간 정보만으로 일정 가능 여부를 판단하지 못했어요");

  await page.getByRole("button", { name: "계획서 인쇄 / PDF 저장" }).click();
  const printDialog = page.getByRole("alertdialog", { name: "아직 시간이 비어 있는 구간이 있어요" });
  await expect(printDialog).toBeVisible();
  await expect(printDialog).toContainText("1개 구간이 도로 응답 지연");
  await expect(printDialog.getByRole("button", { name: "경로 다시 계산" })).toBeVisible();
  await expect(printDialog.getByRole("button", { name: "현재 내용으로 PDF 저장" })).toBeVisible();
  await printDialog.getByRole("button", { name: "닫기" }).click();
  await expect(printDialog).toBeHidden();
});

test("trip sharing labels approximate legs and retries a failed share-link request", async ({ page }) => {
  let shareRequests = 0;
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: null, error: { code: "NO_ROUTE", message: "경로를 찾을 수 없습니다." } }),
    });
  });
  await page.route("**/api/plans/share", async (route) => {
    shareRequests += 1;
    if (shareRequests === 1) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false }) });
      return;
    }
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { code: "abc234", url: "/p/abc234" } }) });
  });

  await page.goto("/");
  const addButtons = page.getByRole("button", { name: /여행에 담기/ });
  await addButtons.nth(0).click();
  await addButtons.nth(0).click();
  await page.locator(".selection-complete-button").click();
  await finishNearbyReview(page);
  await page.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();
  await expect(page.locator(".plan-route-segment")).toContainText("직선거리");
  await page.locator(".plan-actions .btn-save").click();

  const modal = page.getByRole("dialog", { name: "여행 코스 공유하기" });
  await expect(modal.getByRole("status")).toContainText("공유 링크를 만들지 못했어요");
  await expect(modal.getByRole("button", { name: "링크 복사" })).toHaveCount(0);
  await expect(modal.locator(".share-trip-meta")).toContainText("이동시간 확인 필요");
  await expect(modal.locator(".share-trip-meta")).not.toContainText("0분");
  await modal.getByRole("button", { name: "링크 다시 만들기" }).click();
  await expect(modal.getByText(/\/p\/abc234$/)).toBeVisible();
  await expect(modal.getByRole("button", { name: "링크 복사" })).toBeVisible();
  expect(shareRequests).toBe(2);
});

test("print layout contains only the selected travel plan", async ({ page }) => {
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: null, error: { code: "NO_ROUTE", message: "경로를 찾을 수 없습니다." } }),
    });
  });
  await page.goto("/");
  const addButtons = page.getByRole("button", { name: /여행에 담기/ });
  await addButtons.nth(0).click();
  await addButtons.nth(0).click();
  await page.locator(".selection-complete-button").click();
  await finishNearbyReview(page);
  await page.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();
  await expect(page.locator(".plan-route-segment")).toHaveCount(1);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".plan-print-header")).toBeVisible();
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(page.locator(".intro")).toBeHidden();
  await expect(page.locator(".results-primary")).toBeHidden();
  await expect(page.locator(".course-card")).toBeHidden();
  await expect(page.locator(".plan-time-settings")).toBeHidden();
  await expect(page.locator(".plan-print-overview")).toBeVisible();
  await expect(page.locator("#plan-print-overview-title")).toHaveText("이동 요약");
  await expect(page.locator(".plan-report-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".departure-recommendation")).toBeVisible();
  await expect(page.locator(".departure-recommendation-main time")).toHaveText("09:00");
  await expect(page.locator(".plan-place-list li")).toHaveCount(2);
  await expect(page.locator(".plan-route-segment")).toHaveCount(1);
  await expect(page.locator(".route-stop-from")).toContainText("출발 09:00");
  await expect(page.locator("#plan-builder-title")).toHaveCSS("font-size", "32px");
  await expect(page.locator(".print-button")).toBeHidden();
});
