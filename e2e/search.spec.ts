import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("click-only strict search shows proof and safe recovery", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2곳을 둘러보세요" })).toBeVisible();
  await expect(page.locator(".catalog-coverage")).toContainText("상세 수집률 100.0%");
  await expect(page.getByText("1 / 1페이지")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 50곳" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();
  await expect(page.getByText("왜 맞는지 확인", { exact: false })).toHaveCount(0);
  await page.getByLabel("소형견").check();
  await page.getByRole("button", { name: "이동가방 필수" }).click();
  await expect(page.getByRole("heading", { name: "현재 1곳에서 가능을 확인했어요" })).toBeVisible();
  const carrierProof = page.locator(".preparation-list li").filter({ has: page.locator("strong", { hasText: "이동가방" }) }).locator("details.preparation-proof");
  await expect(carrierProof).toHaveCount(1);
  await carrierProof.locator("summary").click();
  await expect(carrierProof).toContainText("이동가방 사용 시 실내 가능");
  await expect(carrierProof).toContainText("관광공사 정보 관측일");
  await expect(carrierProof).toContainText("시연용 데이터 근거");
  await expect(page.getByLabel("가능 명시 확인")).toContainText("가능 명시 확인1");
  await expect(page.getByLabel("가능 명시 확인")).toContainText("정보 미확인0");
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();

  await page.getByText("동반 조건 자세히 보기").click();
  await expect(page.locator(".proof-details li")).toHaveCount(1);

  await page.getByLabel("중형견").check();
  await expect(page.locator(".result-count")).toHaveText("0곳");
  await expect(page.getByRole("heading", { name: "가능이 확인된 장소가 아직 없어요" })).toBeVisible();
  await expect(page.getByText(/정보 미확인 장소 1곳은 정책을 확인하면 조건에 맞을 수도 있어요/)).toBeVisible();
  await expect(page.getByText(/꼭 필요한 조건은 그대로 두었어요/)).toBeVisible();
  await page.getByRole("button", { name: "이동가방 필수" }).click();
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();

  await page.getByLabel("대형견").check();
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();
});

test("narrow viewport keeps content inside the viewport width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2곳을 둘러보세요" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator(".condition-button").first()).toContainText("이동가방 필수");
  const buttonOverflow = await page.locator(".condition-button").first().evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(buttonOverflow).toBeLessThanOrEqual(1);
});

test("map view renders real map markers and links back to the list", async ({ page }) => {
  await page.route(/tile\.openstreetmap\.org/, (route) => route.fulfill({ status: 204, body: "" }));
  await page.goto("/");
  await page.getByRole("tab", { name: /지도에서 탐색/ }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".map-pin-content")).toHaveCount(2);

  await page.locator(".map-pin-content").first().click();
  const sheet = page.locator(".map-place-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: /카카오맵 보기/ })).toHaveAttribute("href", /map\.kakao\.com/);

  await sheet.getByRole("button", { name: /상세 증빙 보기/ }).click();
  await expect(page.locator(".place-row").first()).toBeVisible();
});

test("critical controls are keyboard reachable and expose state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "소형견 가능" })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  const medium = page.getByLabel("중형견");
  await medium.focus();
  await expect(medium).toBeFocused();
  await medium.check();
  await expect(medium).toBeChecked();
  const indoor = page.getByRole("button", { name: "실내 동반", exact: true });
  await indoor.focus();
  await page.keyboard.press("Enter");
  await expect(indoor).toHaveAttribute("aria-pressed", "true");
});

test("Korean is the default and language selection updates the current page", async ({ page }) => {
  await page.goto("/");
  const languageToggle = page.getByRole("group", { name: "Language" });

  await expect(page.getByRole("heading", { name: "함께라서 더 가치 있는 여행, 같이갈개" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");

  await languageToggle.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "A more precious trip together — Gachi Galgae" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2 places to explore" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Region", exact: true }).locator('option[value="강원"]')).toHaveText("Gangwon State");
  await expect(page.locator(".brand")).toHaveAccessibleName("Gachi Galgae home");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(languageToggle.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

  await languageToggle.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "更珍贵的同行之旅 — 一起走吧" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");

  await page.reload();
  await expect(page.getByRole("heading", { name: "함께라서 더 가치 있는 여행, 같이갈개" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");

  const toggleBox = await languageToggle.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(toggleBox!.x + toggleBox!.width).toBeGreaterThan(360);
});

test("clicking the active pet size clears the condition and restores browsing", async ({ page }) => {
  await page.goto("/");
  const medium = page.getByLabel("중형견");

  await medium.click();
  await expect(medium).toBeChecked();
  await medium.click();

  await expect(page.getByRole("radio", { name: "전체 크기 조건 없음" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "2곳을 둘러보세요" })).toBeVisible();
});

test("manual size selection replaces the size inferred from weight", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("예: 8.5").fill("8.5");
  await expect(page.getByLabel("소형견")).toBeChecked();
  await page.getByLabel("대형견").click();
  await expect(page.getByLabel("대형견")).toBeChecked();
  await expect(page.locator(".active-query")).toContainText("대형견");
  await expect(page.locator(".active-query")).not.toContainText("소형견");

  await page.getByPlaceholder("예: 8.5").fill("");
  await expect(page.getByRole("radio", { name: "전체 크기 조건 없음" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "2곳을 둘러보세요" })).toBeVisible();
});

test("large-dog theme overrides a persisted small-dog profile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pet_travel_profile_v1", JSON.stringify({
      name: "보리",
      avatar: "🐶",
      breed: "말티즈",
      weight: "8.5",
      size: "smallDog",
      dangerousDog: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByLabel("소형견")).toBeChecked();
  await page.locator('[data-theme-id="large-dog-free"]').click();

  await expect(page.getByLabel("대형견")).toBeChecked();
  await expect(page.getByLabel("소형견")).not.toBeChecked();
  await expect(page.locator('[data-theme-id="large-dog-free"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".active-query")).toContainText("대형견");

  await page.locator(".size-grid").getByLabel("중형견").check();
  await expect(page.getByLabel("중형견")).toBeChecked();
  await expect(page.getByLabel("대형견")).not.toBeChecked();
  await expect(page.locator(".active-query")).toContainText("중형견");
  await page.waitForTimeout(400);
  await expect(page.getByLabel("중형견")).toBeChecked();
});

test("back navigation from a place detail restores the previous scroll position", async ({ page }) => {
  await page.goto("/");
  const row = page.locator(".place-row").first();
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));
  expect(scrollBefore).toBeGreaterThan(200);

  await row.getByRole("link", { name: /상세/ }).click();
  await page.waitForURL(/\/place\//);
  await page.goBack();
  await page.waitForURL((url) => url.pathname === "/");

  await expect.poll(
    async () => Math.abs((await page.evaluate(() => Math.round(window.scrollY))) - scrollBefore),
    { timeout: 10000 },
  ).toBeLessThan(150);
});

test("theme selection survives back navigation from a place detail page", async ({ page }) => {
  await page.goto("/");
  const themeCard = page.locator('[data-theme-id="healing-cafe"]');
  await themeCard.click();
  await expect(themeCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".active-query")).toContainText("cafe");
  await expect(page.getByRole("heading", { name: "1곳을 둘러보세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();

  await page.locator(".place-row").first().getByRole("link", { name: /상세/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("파도끝 테라스");
  await page.goBack();

  await expect(themeCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".active-query")).toContainText("cafe");
  await expect(page.getByRole("heading", { name: "1곳을 둘러보세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();
});

test("a pending filter request never labels stale browsing rows as filtered results", async ({ page }) => {
  await page.goto("/");
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route("**/api/places?*", async (route) => {
    await requestGate;
    await route.continue();
  });

  await page.getByLabel("중형견").check();
  await expect(page.getByRole("heading", { name: "조건을 확인하고 있어요" })).toBeVisible();
  await expect(page.locator(".decision-summary")).toHaveCount(0);
  await expect(page.locator(".place-list")).toHaveCount(0);

  releaseRequest();
  await expect(page.getByRole("heading", { name: "현재 1곳에서 가능을 확인했어요" })).toBeVisible();
});

test("regional discovery is lazy, expands inline, and can be added to the itinerary", async ({ page }) => {
  let festivalRequests = 0;
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "경로 제공자 지연" } }) });
  });
  await page.route("**/api/festivals?*", async (route) => {
    festivalRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { festivals: [{ contentId: "festival-1", title: "반려견 숲 축제", startDate: "20260801", endDate: "20260831", startDateFormatted: "2026.08.01", endDateFormatted: "2026.08.31", ongoing: true, address: "강원특별자치도 속초시", tel: null, imageUrl: null, mapx: "128.5", mapy: "38.2" }] } }) });
  });

  await page.goto("/");
  await page.getByLabel("지역").selectOption("강원");
  await page.locator(".category-grid").getByRole("button", { name: /카페/ }).click();

  await expect(page.getByRole("heading", { name: "1곳을 둘러보세요" })).toBeVisible();
  await expect(page.locator(".interactive-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".catalog-status")).toHaveCount(0);
  expect(festivalRequests).toBe(0);

  const discovery = page.locator(".context-disclosure").first();
  const followingPanel = page.locator(".nearby-locked");
  const beforeOpen = await followingPanel.evaluate((element) => (element as HTMLElement).offsetTop);
  const discoverySummary = discovery.locator(":scope > summary");
  await discoverySummary.click();
  await expect(discovery.locator("summary + .context-disclosure-body")).toBeVisible();
  const afterOpen = await followingPanel.evaluate((element) => (element as HTMLElement).offsetTop);
  expect(afterOpen).toBeGreaterThan(beforeOpen);
  await expect.poll(() => festivalRequests).toBe(1);
  const addActivity = page.getByRole("button", { name: "코스 경유지로 담기" }).last();
  await addActivity.click();
  await expect(page.getByRole("button", { name: "코스 경유지에 담았어요" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "장소 선택 완료 · 추가 선택", exact: true })).toBeEnabled();
  await expect(page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" })).toHaveCount(0);
  await discoverySummary.click();
  await discoverySummary.click();
  await page.waitForTimeout(100);
  expect(festivalRequests).toBe(1);
  await discovery.locator(".supplemental-review-button").click();
  await expect(discovery.locator(":scope > summary")).toContainText("확인 완료");
  const nearbyReview = page.locator(".nearby-disclosure");
  if (await nearbyReview.getAttribute("open") === null) await nearbyReview.locator("summary").click();
  await nearbyReview.locator(".supplemental-review-button").click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.locator(".selection-complete-button").click();
  const courseBuilder = page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" });
  await expect(courseBuilder.getByRole("checkbox", { name: /반려견 숲 축제/ })).toBeChecked();
  await expect(courseBuilder.getByRole("checkbox")).toHaveCount(2);
  await courseBuilder.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" }).click();
  const dialog = page.getByRole("dialog", { name: "03 · 내 여행 보드" });
  await expect(dialog.locator(".plan-route-segment")).toHaveCount(1);
  await expect(dialog.locator(".plan-route-segment")).toContainText("반려견 숲 축제");
});

test("selection completion moves to supplemental choices and only course confirmation builds the plan", async ({ page }) => {
  await page.route("**/api/directions?*", async (route) => {
    await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ success: false, data: null, error: { code: "PROVIDER_UNAVAILABLE", message: "경로 제공자 지연" } }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  const complete = page.locator(".selection-complete-button");
  await complete.click();
  const supplemental = page.getByRole("region", { name: "축제·산책과 주변 장소도 살펴보세요" });
  await expect(supplemental).toBeInViewport();
  await expect(supplemental).toBeFocused();
  const courseBuilder = page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" });
  expect(await supplemental.evaluate((element) => element.nextElementSibling?.classList.contains("course-card"))).toBe(true);
  await expect(page.locator(".trip-board-plan")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "03 · 내 여행 보드" })).toHaveCount(0);
  const confirmCourse = courseBuilder.getByRole("button", { name: "추가 선택은 선택 사항 · 2곳 코스 만들기" });
  await expect(confirmCourse).toBeEnabled();
  await confirmCourse.click();
  await expect(page.getByRole("dialog", { name: "03 · 내 여행 보드" })).toBeVisible();
  await expect(page.locator(".plan-route-segment")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".course-card .course-button")).toBeFocused();
});

test("one saved place enables direct completion and a one-place course", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  const tray = page.getByRole("button", { name: "장소 선택 완료 · 추가 선택", exact: true });
  await expect(tray).toBeEnabled();
  await expect(page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" })).toHaveCount(0);
  await expect(page.locator(".trip-board-plan")).toHaveCount(0);
  await page.locator(".selection-complete-button").click();
  const courseBuilder = page.getByRole("region", { name: "모두 골랐다면 코스를 확정하세요" });
  await expect(courseBuilder.getByRole("checkbox")).toHaveCount(1);
  await expect(courseBuilder.getByRole("button", { name: "추가 선택은 선택 사항 · 1곳 코스 만들기" })).toBeEnabled();
  await expect(page.locator(".trip-board-plan")).toHaveCount(0);
});

test("saving a place preserves the current viewport and button focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const addButton = page.locator(".place-row").first().locator("button.plan-add-button");
  await addButton.scrollIntoViewIfNeeded();
  await addButton.focus();
  const beforeY = await page.evaluate(() => window.scrollY);

  await page.evaluate(() => {
    const state = window as typeof window & { __selectionScrollCalls?: number };
    state.__selectionScrollCalls = 0;
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      state.__selectionScrollCalls = (state.__selectionScrollCalls ?? 0) + 1;
      original.call(this, options);
    };
  });

  await addButton.click();
  await expect(addButton).toHaveClass(/added/);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  expect(await page.evaluate(() => (window as typeof window & { __selectionScrollCalls?: number }).__selectionScrollCalls ?? 0)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeY);
  await expect(addButton).toBeFocused();
});

test("an empty category result does not request closures without place IDs", async ({ page }) => {
  const emptyClosureRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/places/closures" && !url.searchParams.get("ids")) {
      emptyClosureRequests.push(request.url());
    }
  });

  await page.goto("/");
  await page.getByRole("button", { name: /숙소/ }).click();
  await expect(page.getByRole("heading", { name: "0곳을 둘러보세요" })).toBeVisible();

  expect(emptyClosureRequests).toEqual([]);
});
