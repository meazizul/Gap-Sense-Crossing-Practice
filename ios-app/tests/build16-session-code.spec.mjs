// Build 18: the session code is asked on every start of the app (a pop-up),
// the four activities wait for it, and the app is CrossingTime.
import { test, expect } from "@playwright/test";
import { openApp, setTimes, screenVisible, announcer, watchErrors } from "./helpers.mjs";

const CODE = "2026";

test("every start: the pop-up asks for the code; Later leaves Home usable but locked", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, { locked: true });
  const modal = page.locator("#sessionCodeModal");
  await expect(modal).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeModalTitle");
  expect(await page.evaluate(() => document.querySelector("main")?.inert)).toBe(true);
  await page.click("#sessionCodeLaterBtn");
  await expect(modal).toBeHidden();
  await expect(page.locator("#sessionCodeCard")).toBeVisible();
  await expect(page.locator("#homeLockedNote")).toBeVisible();
  await expect(page.locator("#tryDemoBtn")).toBeHidden();
  for (const step of ["practice", "signal", "compare", "live"]) {
    await expect(page.locator(`.step-card[data-screen="${step}"] button`)).toHaveAttribute("aria-disabled", "true");
  }
  // A link or shortcut to an activity reopens the pop-up.
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "home");
  await expect(modal).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  for (const other of ["help", "instructor", "progress", "shortcuts"]) {
    await page.evaluate((s) => gsShowScreen(s), other);
    await screenVisible(page, other);
  }
  expect(errors).toEqual([]);
});

test("a wrong code names who to ask; the right code unlocks for this run only", async ({ page }) => {
  await openApp(page, { locked: true });
  await setTimes(page);
  await page.fill("#sessionCodeModalInput", "1234");
  await page.click("#sessionCodeModalBtn");
  await expect(page.locator("#sessionCodeModalNote")).toContainText("Ask Azizul Haque or your O&M specialist");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("sessionCodeModalInput");

  await page.fill("#sessionCodeModalInput", ` ${CODE} `);
  await page.press("#sessionCodeModalInput", "Enter");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await expect(page.locator('.step-card[data-screen="practice"] button')).toHaveAttribute("aria-disabled", "false");
  await expect.poll(() => page.evaluate(() => document.activeElement?.className)).toContain("step-button");
  expect(await page.evaluate(() => sessionStorage.getItem("gs-session-unlocked"))).toBe("true");
  expect(await page.evaluate(() => localStorage.getItem("om-unlocked"))).toBeNull();
  // Same run (a reload keeps sessionStorage): still open.
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await page.evaluate(() => gsShowScreen("practice"));
  await screenVisible(page, "practice");
  // A new start (sessionStorage gone, as when the app is closed): asked again.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof gsBoot === "function");
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
});

test("the Home card works too, and old installs with the build 16/17 flag are asked like everyone", async ({ page }) => {
  await openApp(page, { locked: true, storage: { "om-unlocked": "true", "om-lock-seen": "1", "om-clear-time": "4", "om-full-time": "8", "om-margin": "0.4" } });
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
  await page.click("#sessionCodeLaterBtn");
  await expect(page.locator("#sessionCodeModal")).toBeHidden();
  await expect(page.locator("#sessionCodeInput")).toBeFocused();
  await page.fill("#sessionCodeInput", CODE);
  await page.click("#sessionCodeBtn");
  await expect(page.locator("#sessionCodeCard")).toBeHidden();
  await expect(page.locator("#sessionCodeNote")).toContainText("Unlocked");
  expect(await page.evaluate(() => localStorage.getItem("om-unlocked"))).toBeNull();
  expect(await announcer(page)).toContain("Unlocked");
});

test("first run: guidance, tutorial, then the code pop-up", async ({ page }) => {
  await openApp(page, { locked: true, disclaimerSeen: false, tutorialSeen: false });
  await expect(page.locator("#disclaimerModal")).toBeVisible();
  await page.click("#disclaimerAcceptBtn");
  await expect(page.locator("#tutorialModal")).toBeVisible();
  await page.click("#closeTutorial");
  await expect(page.locator("#sessionCodeModal")).toBeVisible();
});

test("no double-tap zoom: every element opts out, the swipe pads keep touch-action none", async ({ page }) => {
  await openApp(page);
  const values = await page.evaluate(() => ({
    body: getComputedStyle(document.body).touchAction,
    intro: getComputedStyle(document.querySelector(".om-guidance")).touchAction,
    title: getComputedStyle(document.getElementById("screenTitle")).touchAction,
    pad: getComputedStyle(document.getElementById("answerSurface")).touchAction,
    live: getComputedStyle(document.getElementById("liveSurface")).touchAction
  }));
  expect(values.body).toBe("manipulation");
  expect(values.intro).toBe("manipulation");
  expect(values.title).toBe("manipulation");
  expect(values.pad).toBe("none");
  expect(values.live).toBe("none");
});

test("the app is CrossingTime everywhere a user reads the name", async ({ page }) => {
  await openApp(page);
  expect(await page.title()).toContain("CrossingTime");
  await expect(page.locator("#screenTitle")).toHaveText("CrossingTime");
  await page.evaluate(() => gsShowScreen("help"));
  await expect(page.locator("#aboutVersion")).toContainText("CrossingTime version 1.0, build 18");
  const manifest = await page.evaluate(async () => (await (await fetch("manifest.webmanifest")).json()));
  expect(manifest.name).toBe("CrossingTime");
  expect(await page.evaluate(() => document.body.innerText.includes("Gap Sense"))).toBe(false);
});
