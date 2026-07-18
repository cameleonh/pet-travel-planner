import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_DATA_PROVIDER !== "database", "Runs only against the local official-data snapshot.");

test("official database snapshot supports mobile destination, profile, proof, and course flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "1,000곳을 둘러보세요" })).toBeVisible();
  await expect(page.getByText(/전체 9,764곳 중 상세정보 수집 1,000곳 · 수집 대기 8,764곳/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "근처에 같이 들를 곳" })).toHaveCount(0);

  await page.getByPlaceholder("예: 속초, 제주, 부산 해운대").fill("서울");
  await expect(page.getByRole("heading", { name: /곳을 둘러보세요/ })).toBeVisible();

  await page.locator(".weight-input input").fill("8.5");
  await expect(page.getByLabel("소형견")).toBeChecked();
  await expect(page.getByRole("heading", { name: /현재 \d+곳에서 가능을 확인했어요/ })).toBeVisible();

  const courseButton = page.getByRole("button", { name: /\d+곳 코스 만들기/ });
  await expect(courseButton).toBeEnabled();
  await courseButton.click();
  await expect(page.locator(".course-result")).toContainText("실제 이동 시간이나 길 안내가 아닙니다");
  await expect(page.locator(".course-result a").first()).toHaveAttribute("href", /map\.kakao\.com\/link\/to\//);

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/icon.svg");
});
