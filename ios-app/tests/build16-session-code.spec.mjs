// Build 16: the four activities wait for the session code; the app is
// CrossingTime.
import { test, expect } from "@playwright/test";
import { openApp, setTimes, screenVisible, announcer, watchErrors } from "./helpers.mjs";

const CODE = "2026";

test("fresh install: locked card, dimmed activities, Help and setup still open", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { locked: true });
  await expect(page.locator("#sessionCodeCard")).toBeVisible();
  await expect(page.locator("#homeLockedNote")).toBeVisible();
  await expect(page.locator("#tryDemoBtn")).toBeHidden();
  for (const step of ["practice", "signal", "compare", "live"]) {
    await expect(page.locator(`.step-card[data-screen="${step}"] button`)).toHaveAttribute("aria-disabled", "true");
  }
  // A link or shortcut to an activity lands on Home with the field focused.
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "home");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeInput");
  expect(await announcer(page)).toContain("session code");
  // Everything that is not practice still opens.
  for (const other of ["help", "instructor", "progress", "shortcuts"]) {
    await page.evaluate((s) => gsShowScreen(s), other);
    await screenVisible(page, other);
  }
  expect(errors).toEqual([]);
});

test("a wrong code is refused and announced; the right code unlocks and persists", async ({ page }) => {
  await openApp(page, { locked: true });
  await setTimes(page);
  await page.fill("#sessionCodeInput", "1234");
  await page.click("#sessionCodeBtn");
  await expect(page.locator("#sessionCodeNote")).toContainText("did not match");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeInput");
  await expect(page.locator("#sessionCodeCard")).toBeVisible();

  await page.fill("#sessionCodeInput", ` ${CODE} `);
  await page.press("#sessionCodeInput", "Enter");
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await expect(page.locator("#sessionCodeNote")).toContainText("Unlocked");
  await expect(page.locator('.step-card[data-screen="practice"] button')).toHaveAttribute("aria-disabled", "false");
  await expect.poll(() => page.evaluate(() => document.activeElement?.className)).toContain("step-button");
  expect(await page.evaluate(() => localStorage.getItem("om-unlocked"))).toBe("true");
  // Survives a reload (and the durable copy carries it).
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "practice");
});

test("an install updated from an earlier build with data on it is open at once", async ({ page }) => {
  await openApp(page, { locked: true, storage: { "om-clear-time": "4", "om-full-time": "8", "om-margin": "0.4" } });
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  expect(await page.evaluate(() => [localStorage.getItem("om-unlocked"), localStorage.getItem("om-lock-seen")])).toEqual(["true", "1"]);
  await page.evaluate(() => gsShowScreen("compare"));
  await screenVisible(page, "compare");
});

test("a brand-new install stays locked even after entering times later", async ({ page }) => {
  await openApp(page, { locked: true });
  expect(await page.evaluate(() => localStorage.getItem("om-lock-seen"))).toBe("1");
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("home"));
  await expect(page.locator("#sessionCodeCard")).toBeVisible();
  await expect(page.locator("#homeSetupBanner")).toBeHidden();
});

test("the app is CrossingTime everywhere a user reads the name", async ({ page }) => {
  await openApp(page);
  expect(await page.title()).toContain("CrossingTime");
  await expect(page.locator("#screenTitle")).toHaveText("CrossingTime");
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutVersion")).toContainText("CrossingTime version 1.0, build 16");
  const manifest = await page.evaluate(async () => (await (await fetch("manifest.webmanifest")).json()));
  expect(manifest.name).toBe("CrossingTime");
  expect(manifest.short_name).toBe("CrossingTime");
  expect(await page.evaluate(() => document.body.innerText.includes("Gap Sense"))).toBe(false);
});
