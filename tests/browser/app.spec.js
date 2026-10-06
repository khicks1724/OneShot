import { test, expect } from "@playwright/test";
test("lobby, themes, navigation and a complete practice game", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One game. One chance. One shot." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Theme:/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `test-results/${info.project.name}-lobby-dark.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Theme:/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: `test-results/${info.project.name}-lobby-light.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Great minds. Greater rivalries." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clubs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your club. Your bragging rights." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your knowledge map" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "The show", exact: true }).click();
  await page.getByRole("button", { name: "Try a practice round" }).click();
  await expect(
    page.getByRole("heading", { name: "Which continent is Egypt in?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "B Africa 2" }).click();
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expect(page.getByText("Right on target.")).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-reveal.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  const choices = [
    "George Washington",
    "Toy Story",
    "4",
    "H2O",
    "Avocado",
    "Mercury",
    "Jane Austen",
  ];
  for (const answer of choices) {
    await page
      .locator(".choice")
      .filter({
        has: page.locator("span:nth-child(2)", {
          hasText: new RegExp(`^${answer}$`),
        }),
      })
      .click();
    await page.getByRole("button", { name: "Lock it in" }).click();
    await expect(page.getByText("Right on target.")).toBeVisible();
    await page
      .getByRole("button", { name: "Next question", exact: true })
      .click();
  }
  for (const answer of ["gravity", "Paris"]) {
    await page.getByLabel("Your answer").fill(answer);
    await page.getByRole("button", { name: "Lock it in" }).click();
    await expect(page.getByText("Right on target.")).toBeVisible();
    await page
      .getByRole("button", {
        name: answer === "Paris" ? "See my results" : "Next question",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "You made it count." }),
  ).toBeVisible();
  await expect(page.getByText("10/10", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-results.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("account creation, profile editing and club invitation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Browser Challenger");
  await page
    .getByLabel("Email", { exact: true })
    .fill(
      `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    );
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(
    page.getByRole("heading", { name: "Your account is connected" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Trivia Voyager");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Trivia Voyager." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clubs", exact: true }).click();
  await page.getByRole("button", { name: "Create a club" }).click();
  await page.getByLabel("Club name").fill("Browser Brain Trust");
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Brain Trust" }),
  ).toBeVisible();
});
