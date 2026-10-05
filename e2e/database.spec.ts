import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_DATA_PROVIDER !== "database", "Runs only against the local official-data snapshot.");

test("official database snapshot supports mobile destination, profile, proof, and course flow", async ({ page }) => {
  await page.goto("/");

  const resultHeading = page.getByRole("heading", { name: /곳을 둘러보세요/ });
  await expect(resultHeading).toBeVisible();
  await expect(page.locator(".catalog-coverage")).toHaveText(
    /현재 상세정보 확인 가능 [\d,]+곳 · 전국 원천 [\d,]+곳 · 상세 수집률 \d+\.\d% · 미수집 [\d,]+곳 · 실패 [\d,]+곳/,
  );
  await expect(page.getByRole("heading", { name: "근처에 같이 들를 곳" })).toHaveCount(0);

  await page.getByLabel("지역").selectOption("부산");
  await page.getByLabel("시·군·구").selectOption("부산 해운대구");
  const firstResult = page.locator(".place-card").first();
  await expect(firstResult).toContainText("부산");
  await expect(firstResult).toContainText("해운대");
  const resultCount = Number((await resultHeading.textContent())?.replace(/[^\d]/g, ""));
  expect(resultCount).toBeGreaterThan(0);

  await page.locator(".weight-input input").fill("8.5");
  await expect(page.getByLabel("소형견")).toBeChecked();
  await expect(page.getByRole("heading", { name: /현재 \d+곳에서 가능을 확인했어요/ })).toBeVisible();
  const readCount = async () => Number((await page.locator(".result-count").textContent())?.replace(/[^\d]/g, ""));
  const smallDogCount = await readCount();
  await page.getByRole("button", { name: "이동가방 필수" }).click();
  await expect.poll(readCount).toBeLessThan(smallDogCount);
  await page.locator(".category-grid").getByRole("button", { name: /관광지/ }).click();
  await expect(page.getByRole("heading", { name: "해운대 블루라인파크" })).toBeVisible();
  const carrierEvidence = page.locator(".preparation-list li").filter({ has: page.locator("strong", { hasText: "이동가방" }) }).locator("details.preparation-proof");
  await expect(carrierEvidence).toHaveCount(1);
  await carrierEvidence.locator("summary").click();
  await expect(carrierEvidence).toContainText("관광공사 정보 관측일");
  await expect(carrierEvidence.getByRole("link", { name: "관광공사 원문 보기 ↗" })).toHaveAttribute("href", "https://www.data.go.kr/data/15135102/openapi.do");
  await page.locator(".category-grid").getByRole("button", { name: /관광지/ }).click();
  await expect.poll(readCount).toBeGreaterThan(1);

  await page.getByRole("button", { name: /여행에 담기/ }).nth(0).click();
  await page.getByRole("button", { name: /여행에 담기/ }).first().click();
  await page.locator(".selection-complete-button").click();
  const regionalReview = page.locator(".supplemental-choices .context-disclosure").first();
  await regionalReview.locator("summary").click();
  await regionalReview.locator(".supplemental-review-button").click();
  const nearbyReview = page.locator(".nearby-disclosure");
  if (await nearbyReview.getAttribute("open") === null) await nearbyReview.locator("summary").click();
  await nearbyReview.locator(".supplemental-review-button").click();
  const courseButton = page.getByRole("button", { name: /추가 선택은 선택 사항 · \d+곳 코스 만들기/ });
  await expect(courseButton).toBeEnabled();
  await courseButton.click();
  await expect(page.getByRole("dialog", { name: "03 · 내 여행 보드" })).toBeVisible();
  await expect(page.locator(".plan-route-segment")).toHaveCount(1);
  await expect(page.locator(".plan-hours-disclosure")).toContainText("장소별 이용시간과 휴무 정보도 확인");
  await expect(page.locator(".plan-place-list .plan-operating-hours").first()).toContainText("휴무");
  await expect(page.locator(".route-links a").first()).toHaveAttribute("href", /map\.kakao\.com/);

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/icon.svg");
});
