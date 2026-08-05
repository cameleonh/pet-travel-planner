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
  await page.getByRole("button", { name: "이동가방 사용" }).click();
  await expect(page.getByRole("heading", { name: "현재 1곳에서 가능을 확인했어요" })).toBeVisible();
  await expect(page.getByLabel("조건 판정 현황")).toContainText("가능 명시 확인1");
  await expect(page.getByLabel("조건 판정 현황")).toContainText("정보 미확인1");
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "파도끝 테라스" })).toBeVisible();

  await page.getByText("왜 맞는지 확인 · 근거 3개").click();
  await expect(page.locator(".proof-details li")).toHaveCount(3);

  await page.getByLabel("중형견").check();
  await expect(page.locator(".result-count")).toHaveText("0곳");
  await expect(page.getByRole("heading", { name: "아직 가능이 확인된 곳은 없어요" })).toBeVisible();
  await expect(page.getByText(/정보 미확인 장소 2곳은 정책을 확인하면 조건에 맞을 수도 있어요/)).toBeVisible();
  await expect(page.getByText(/‘이동가방’만 빼면 1곳/)).toBeVisible();
  await page.getByRole("button", { name: "이동가방 빼고 1곳 보기" }).click();
  await expect(page.locator(".result-count")).toHaveText("1곳");
  await expect(page.getByRole("heading", { name: "솔바람 산책정원" })).toBeVisible();

  await page.getByLabel("대형견").check();
  await expect(page.locator(".result-count")).toHaveText("0곳");
  await expect(page.getByText(/꼭 필요한 조건은 그대로 두었어요/)).toBeVisible();
});

test("critical controls are keyboard reachable and expose state", async ({ page }) => {
  await page.goto("/");
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

test("clicking the active pet size clears the condition and restores browsing", async ({ page }) => {
  await page.goto("/");
  const medium = page.getByLabel("중형견");

  await medium.click();
  await expect(medium).toBeChecked();
  await medium.click();

  await expect(page.getByLabel("전체")).toBeChecked();
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

test("an empty destination result does not request closures without place IDs", async ({ page }) => {
  const emptyClosureRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/places/closures" && !url.searchParams.get("ids")) {
      emptyClosureRequests.push(request.url());
    }
  });

  await page.goto("/");
  await page.getByPlaceholder("예: 속초, 제주, 부산 해운대").fill("없는 지역");
  await expect(page.getByRole("heading", { name: "0곳을 둘러보세요" })).toBeVisible();

  expect(emptyClosureRequests).toEqual([]);
});
