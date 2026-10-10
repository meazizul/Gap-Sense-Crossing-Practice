import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible } from "./helpers.mjs";

test("boots with no console errors and shows home with every activity locked", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await screenVisible(page, "home");
  await expect(page.locator("#homeSetupBanner")).toBeVisible();
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times not set");
  for (const step of ["practice", "signal", "compare", "live"]) {
    await expect(page.locator(`.step-card[data-screen="${step}"] button`)).toBeDisabled();
  }
  await expect(page.locator(".step-card")).toHaveCount(4);
  await expect(page.locator("#screen-measure")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("every screen opens and closes without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page);
  for (const name of ["practice", "signal", "compare", "live", "progress", "help"]) {
    await page.evaluate((n) => gsShowScreen(n), name);
    await screenVisible(page, name);
    await expect(page.locator("#screenTitle")).not.toHaveText("");
    await page.click("#backBtn");
    await screenVisible(page, "home");
  }
  expect(errors).toEqual([]);
});

test("settings and accessibility dialogs open, close, and restore focus", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.click("#settingsTrigger");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", true);
  await expect(page.locator("#instructorEmail")).toBeVisible();
  await expect(page.locator("#clientCode")).toBeVisible();
  await page.click("#closeSettings");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", false);
  await expect(page.locator("#settingsTrigger")).toBeFocused();
  await page.click("#a11yTrigger");
  await expect(page.locator("#a11yModal")).toHaveJSProperty("open", true);
  await page.click("#closeA11y");
  await expect(page.locator("#a11yModal")).toHaveJSProperty("open", false);
  expect(errors).toEqual([]);
});

test("home 'Open Settings' button opens the settings dialog", async ({ page }) => {
  await openApp(page);
  await page.click("#homeOpenSettingsBtn");
  await expect(page.locator("#settingsModal")).toHaveJSProperty("open", true);
});

test("first run shows the tutorial once", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { tutorialSeen: false });
  await expect(page.locator("#tutorialModal")).toHaveJSProperty("open", true, { timeout: 5000 });
  await expect(page.locator("[data-demo='sample']")).toBeVisible();
  await expect(page.locator("[data-demo='signal']")).toBeVisible();
  await page.click("[data-demo='sample']");
  await page.click("[data-demo='signal']");
  await page.click("#closeTutorial");
  await expect(page.locator("#tutorialModal")).toHaveJSProperty("open", false);
  expect(await page.evaluate(() => localStorage.getItem("om-tutorial-seen"))).toBe("true");
  expect(errors).toEqual([]);
});

test("demo link loads example times and lands on practice", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { query: "?demo=1" });
  await screenVisible(page, "practice");
  expect(await page.evaluate(() => localStorage.getItem("om-demo-times"))).toBe("true");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, marginInput.value])).toEqual(["4.0", "8.0", "0.5"]);
  await page.click("#backBtn");
  await expect(page.locator("#homeTimes")).toHaveText("Using example crossing times");
  await expect(page.locator("#screen-home .demo-note")).toBeVisible();
  // Setting real times clears the demo note, whichever path sets them.
  await setTimes(page, "3", "6.5");
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times set");
  await expect(page.locator("#screen-home .demo-note")).toBeHidden();
  expect(errors).toEqual([]);
});
