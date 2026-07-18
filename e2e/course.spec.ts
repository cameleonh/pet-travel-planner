import { expect, test } from "@playwright/test";

test("nearby catalog separates status and location denial falls back", async ({ page }) => {
  await page.goto("/");
  const nearby = page.locator("section", {
    has: page.getByRole("heading", { name: "근처에 같이 들를 곳" }),
  });
  await expect(nearby.getByText("동반 확인")).toBeVisible();
  await expect(nearby.getByText("해오름 동물병원")).toBeVisible();
  await expect(nearby.getByText("청초호 반려산책구간")).toBeVisible();
  await expect(nearby.getByText("전화 확인 필요")).toBeVisible();
  await expect(nearby.getByText("바다생활박물관")).toBeVisible();
  await page.getByRole("button", { name: "내 위치로 보기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "위치 권한 없이" })).toBeVisible();
});

test("course uses current exact results and discloses approximate distance only", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "먼저 맞는 장소를 찾아주세요" })).toBeDisabled();
  await page.getByLabel("소형견").check();
  await page.getByRole("button", { name: "목줄 착용" }).click();
  await expect(page.locator(".result-count")).toHaveText("2곳");
  await page.getByRole("button", { name: "2곳 코스 만들기" }).click();
  const course = page.locator(".course-result");
  await expect(course).toContainText("가까운 순서로 정리했어요");
  await expect(course.locator("li")).toHaveCount(2);
  await expect(course).toContainText("파도끝 테라스");
  await expect(course).toContainText("솔바람 산책정원");
  await expect(course).not.toContainText(/\d+분/);
  await expect(course).toContainText("실제 이동 시간이나 길 안내가 아닙니다");
});
