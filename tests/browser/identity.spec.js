import { test, expect } from "@playwright/test";

test("new typography, both mascot options, pointer response and saved selection", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One game. One chance. One shot." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() =>
    [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family),
  );
  expect(fonts).toContain("IBM Plex Sans");
  expect(fonts).toContain("Barlow Condensed");
  expect(fonts).toContain("Yesteryear");
  const sidekick = page.locator(".mascot-stage .mascot");
  await expect(sidekick).toHaveClass(/slug/);
  await page.mouse.move(20, 150);
  await expect
    .poll(() =>
      sidekick.evaluate((el) => el.style.getPropertyValue("--look-x")),
    )
    .not.toBe("");
  await page.getByRole("button", { name: "Say hello to Slugger" }).click();
  await expect(sidekick).toHaveAttribute("data-mood", "wave");
  await page
    .locator(".mascot-options > button")
    .filter({ hasText: "Stubbs" })
    .click();
  await expect(sidekick).toHaveClass(/ticket/);
  await page.getByRole("button", { name: "Say hello to Stubbs" }).click();
  await expect(sidekick).toHaveAttribute("data-mood", "wave");
  await page.reload();
  await expect(sidekick).toHaveClass(/ticket/);
  await page.getByRole("button", { name: /Theme:/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `test-results/${info.project.name}-stubbs-dark.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Theme:/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: `test-results/${info.project.name}-stubbs-light.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("mascot reacts to answers and honors reduced motion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a practice round" }).click();
  const mascot = page.locator(".game-sidekick .mascot");
  await expect(mascot).toHaveAttribute("data-mood", "idle");
  await page.getByRole("button", { name: "B Africa 2" }).click();
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expect(mascot).toHaveAttribute("data-mood", "celebrate");
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await page.locator(".choice").filter({ hasText: "Thomas Jefferson" }).click();
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expect(mascot).toHaveAttribute("data-mood", "oops");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      mascot
        .locator(".character")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
});
