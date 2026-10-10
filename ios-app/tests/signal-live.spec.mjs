import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible, history, tick, announcer, statusText, waitUntil } from "./helpers.mjs";

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

async function waitForSignal(page) {
  for (let i = 0; i < 100; i += 1) {
    await page.clock.runFor(100);
    if (await page.evaluate(() => gsSignalState.phase === "timing")) return;
  }
  throw new Error("signal never fired");
}

test("signal: ready, wait, signal, press on time, replay, logged", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await page.click("#signalBtn");
  await expect(page.locator("#signalBtnLabel")).toHaveText("WAIT");
  expect(await announcer(page)).toContain("Wait for the signal");
  await waitForSignal(page);
  await expect(page.locator("#signalBtnLabel")).toHaveText("NOW");
  await tick(page, 8000);                                // full street is 8 s
  await page.click("#signalBtn");
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "signal", street: "full", correct: true, marginSec: 0.4 });
  expect(Math.abs(log[0].userSec - 8)).toBeLessThan(0.15);
  await expect(page.locator("#signalBtn")).toBeDisabled();  // replaying
  await tick(page, 12000);
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await expect(page.locator("#signalBtn")).toBeEnabled();
  await expect(page.locator("#signalScore")).toHaveText("Last 1: 1 within margin · margin 0.40s");
  expect(await statusText(page, "signalStatusText")).toContain("Within the margin");
  expect(errors).toEqual([]);
});

test("signal: a press before the signal is a false start and records nothing", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("#signalBtn");
  await page.clock.runFor(300);
  await page.click("#signalBtn");
  expect(await statusText(page, "signalStatusText")).toContain("Too early");
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await tick(page, 10000);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
});

test("signal: leaving while waiting cancels the pending signal", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("#signalBtn");
  await page.click("#backBtn");
  await tick(page, 10000);
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(await history(page)).toEqual([]);
});

test("live: times a vehicle, gives the verdict, replays, keeps the microphone closed", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  expect(await page.evaluate(() => gsNoise.analyser === null && gsNoise.stream === null)).toBe(true);
  await expect(page.locator("#liveSampleNoiseBtn")).toBeDisabled();
  await expect(page.locator("#liveNoiseNote")).toContainText("microphone stays closed");

  await page.click("#liveBtn");                          // detected
  await expect(page.locator("#liveBtnLabel")).toHaveText("PASSED");
  await expect(page.locator("#liveCancelBtn")).toBeVisible();
  await tick(page, 6000);                                // 6 s warning vs 4 s first half
  await page.click("#liveBtn");                          // passed
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", street: "half", expected: "longer", correct: true, noisy: false });
  expect(await statusText(page, "liveStatusText")).toContain("enough warning");
  expect(await announcer(page)).toContain("enough warning");
  await expect(page.locator("#liveTally")).toHaveText("Last 1: 1 gave enough warning");
  await tick(page, 15000);
  expect(await page.evaluate(() => gsLiveState.replaying)).toBe(false);
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  expect(await page.evaluate(() => gsNoise.analyser === null)).toBe(true);
  expect(errors).toEqual([]);
});

test("live: direction from the right compares with the full street and short warnings are flagged", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.check("input[name='liveDirection'][value='right']");
  expect(await announcer(page)).toContain("full-street time");
  await page.click("#liveBtn");
  await tick(page, 5000);                                // 5 s warning vs 8 s full street
  await page.click("#liveBtn");
  const log = await history(page);
  expect(log[0]).toMatchObject({ street: "full", expected: "shorter", correct: false });
  expect(await statusText(page, "liveStatusText")).toContain("Not enough warning");
});

test("live: cancel discards the vehicle", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveBtn");
  await page.click("#liveCancelBtn");
  await expect(page.locator("#liveBtnLabel")).toHaveText("DETECTED");
  expect(await history(page)).toEqual([]);
});

test("live: the noise check opens the microphone only while on, and closes it on leaving", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("live"));
  await page.evaluate(() => { document.querySelector("#screen-live details.options-card").open = true; });
  await page.check("#liveNoiseEnabled");
  await waitUntil(page, () => gsNoise.analyser !== null);
  await expect(page.locator("#liveSampleNoiseBtn")).toBeEnabled();
  await page.click("#backBtn");
  expect(await page.evaluate(() => gsNoise.analyser === null && gsNoise.stream === null)).toBe(true);
  // Re-entering with the switch still on re-opens it; switching off closes it.
  await page.evaluate(() => gsShowScreen("live"));
  await waitUntil(page, () => gsNoise.analyser !== null);
  await page.uncheck("#liveNoiseEnabled");
  expect(await page.evaluate(() => gsNoise.analyser === null)).toBe(true);
});

test("live: leaving before the microphone permission resolves releases the stream", async ({ page }) => {
  await openApp(page, { storage: { "om-live-noise": "true" } });
  await setTimes(page);
  // Make getUserMedia slow so we can leave while it is pending.
  await page.evaluate(() => {
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    window.__stopped = 0;
    navigator.mediaDevices.getUserMedia = (c) => new Promise((resolve) => setTimeout(async () => {
      const stream = await real(c);
      stream.getTracks().forEach((t) => { const s = t.stop.bind(t); t.stop = () => { window.__stopped += 1; s(); }; });
      resolve(stream);
    }, 1500));
  });
  await page.evaluate(() => gsShowScreen("live"));
  await page.clock.runFor(200);
  await page.click("#backBtn");
  await tick(page, 3000);
  await waitUntil(page, () => window.__stopped > 0);
  expect(await page.evaluate(() => gsNoise.stream === null && gsNoise.analyser === null)).toBe(true);
});
