import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("click-only strict search shows proof and safe recovery", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2곳을 둘러보세요" })).toBeVisible();
  await expect(page.getByText("1 / 1페이지")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 50곳" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();
  await expect(page.getByText("왜 맞는지 확인", { exact: false })).toHaveCount(0);
  await page.getByLabel("소형견").check();
  await page.getByRole("button", { name: "목줄 착용" }).click();
  await page.getByRole("button", { name: "이동가방 가능" }).click();
  await expect(page.getByRole("heading", { name: "현재 1곳에서 가능을 확인했어요" })).toBeVisible();
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
  await page.getByRole("button", { name: "이동가방 가능" }).click();
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();

  await page.getByLabel("대형견").check();
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();
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
  const indoor = page.getByRole("button", { name: /실내 동반/ });
  await indoor.focus();
  await page.keyboard.press("Enter");
  await expect(indoor).toHaveAttribute("aria-pressed", "true");
});

test("language selection updates the page and survives reload", async ({ page }) => {
  await page.goto("/");
  const languageToggle = page.getByRole("group", { name: "Language" });

  await languageToggle.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "A more precious trip together — Gachi Galgae" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(languageToggle.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

  await languageToggle.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "更珍贵的同行之旅 — 一起走吧" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");

  await page.reload();
  await expect(page.getByRole("heading", { name: "更珍贵的同行之旅 — 一起走吧" })).toBeVisible();
  await expect(languageToggle.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");

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

test("slow festival enrichment never keeps place results in a searching state", async ({ page }) => {
  let releaseFestivals!: () => void;
  const festivalGate = new Promise<void>((resolve) => { releaseFestivals = resolve; });
  await page.route("**/api/festivals?*", async (route) => {
    await festivalGate;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { festivals: [] } }) });
  });

  await page.goto("/");
  await page.getByLabel("지역").selectOption("강원");
  await page.getByRole("button", { name: /카페/ }).click();

  await expect(page.getByRole("heading", { name: "1곳을 둘러보세요" })).toBeVisible();
  await expect(page.locator(".interactive-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".catalog-status")).toHaveCount(0);
  releaseFestivals();
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
