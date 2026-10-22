import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible, history, tick, announcer, statusText, waitUntil, swipeOn, answerOn, streetGesture } from "./helpers.mjs";

test.beforeEach(async ({ page }) => {
  // Speech: record what is said and finish at once, so the flows do not wait.
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = {
      speaking: false,
      cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); },
      getVoices() { return []; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await page.clock.install();
});

async function waitForSound(page) {
  for (let i = 0; i < 200; i += 1) {
    await page.clock.runFor(100);
    if (await page.evaluate(() => gsSignalState.phase === "timing")) return;
  }
  throw new Error("the sound never started");
}

/* ---------------- Comparison preparation ---------------- */

test("preparation: Ready says 'Get ready' (no beep), the steady sound plays until pressed, replay, logged", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("input[name='signalStreet'][value='full']");   // build 14: First half is the default (F6)
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await page.evaluate(() => {
    window.__beeps = 0;
    const real = window.playConfirmTone;
    window.playConfirmTone = (...a) => { window.__beeps += 1; return real(...a); };
    window.__sustained = 0;
    const realSustain = window.startSustainedTone;
    window.startSustainedTone = (...a) => {
      window.__sustained += 1;
      const stop = realSustain(...a);
      return () => { window.__stopped = true; stop(); };
    };
  });
  await page.click("#signalBtn");
  await expect(page.locator("#signalBtnLabel")).toHaveText("WAIT");
  expect(await page.evaluate(() => window.__spoken)).toContain("Get ready");
  expect(await page.evaluate(() => window.__beeps)).toBe(0);
  expect(await statusText(page, "signalStatusText")).toContain("Get ready");
  await waitForSound(page);
  await expect(page.locator("#signalBtnLabel")).toHaveText("NOW");
  expect(await page.evaluate(() => window.__sustained)).toBe(1);
  await tick(page, 8000);                                // full street is 8 s
  await page.click("#signalBtn");
  expect(await page.evaluate(() => window.__stopped)).toBe(true);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "signal", street: "full", correct: true, marginSec: 0.4 });
  expect(Math.abs(log[0].userSec - 8)).toBeLessThan(0.15);
  await expect(page.locator("#signalBtn")).toHaveAttribute("aria-disabled", "true");  // replaying: busy, never disabled (12.27)
  await tick(page, 12000);
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await expect(page.locator("#signalBtn")).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator("#signalScore")).toHaveText("Last 1: 1 within margin · margin 0.40s");
  // No verdict words: the cue and the replay carry the result (12.29).
  expect(await statusText(page, "signalStatusText")).toBe("Ready for another.");
  expect(errors).toEqual([]);
});

test("preparation: the beep style plays one short sound, not a sustained one", async ({ page }) => {
  await openApp(page, { storage: { "om-prep-sound": "beep" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    window.__sustained = 0;
    const real = window.startSustainedTone;
    window.startSustainedTone = (...a) => { window.__sustained += 1; return real(...a); };
  });
  await page.click("#signalBtn");
  await waitForSound(page);
  expect(await page.evaluate(() => window.__sustained)).toBe(0);
  await tick(page, 4000);
  await page.click("#signalBtn");
  expect(await history(page)).toHaveLength(1);
});

test("preparation: wait times mix quick, medium and long, never the same band three times running", async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const waits = [];
    gsSignalState.lastBuckets = [];
    for (let i = 0; i < 600; i += 1) waits.push(gsSignalWaitSec());
    const band = (w) => (w < 2 ? "q" : w < 5 ? "m" : "l");
    const bands = waits.map(band);
    let triples = 0;
    for (let i = 2; i < bands.length; i += 1) if (bands[i] === bands[i - 1] && bands[i] === bands[i - 2]) triples += 1;
    return {
      min: Math.min(...waits), max: Math.max(...waits),
      quick: bands.filter((b) => b === "q").length, medium: bands.filter((b) => b === "m").length, long: bands.filter((b) => b === "l").length,
      triples
    };
  });
  expect(r.min).toBeGreaterThanOrEqual(0.7);
  expect(r.max).toBeLessThanOrEqual(10);
  expect(r.quick).toBeGreaterThan(60);
  expect(r.medium).toBeGreaterThan(60);
  expect(r.long).toBeGreaterThan(60);
  expect(r.triples).toBe(0);
});

test("preparation: a press before the sound is a false start and records nothing", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("#signalBtn");
  await page.clock.runFor(300);
  await page.click("#signalBtn");
  expect(await statusText(page, "signalStatusText")).toContain("Too early");
  await expect(page.locator("#signalBtnLabel")).toHaveText("READY");
  await tick(page, 12000);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
});

test("preparation: leaving while the sound plays stops it and records nothing", async ({ page }) => {
  await openApp(page);
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("#signalBtn");
  await waitForSound(page);
  await page.click("#backBtn");
  expect(await page.evaluate(() => gsSignalState.stopTone)).toBeNull();
  await tick(page, 12000);
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(await history(page)).toEqual([]);
});

test("preparation: a forgotten phone stops by itself and records nothing", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await page.click("#signalBtn");
  await waitForSound(page);
  await tick(page, 25000);                               // 3 x 8 s
  expect(await page.evaluate(() => gsSignalState.phase)).toBe("idle");
  expect(await statusText(page, "signalStatusText")).toContain("No press");
  expect(await history(page)).toEqual([]);
});

/* ---------------- At the street ---------------- */

async function openLive(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
}

async function untilReady(page) {
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 40000, step: 250 });
}

test("street: no microphone and no quiet-level check anywhere", async ({ page }) => {
  await openLive(page);
  await expect(page.locator("#liveNoiseEnabled")).toHaveCount(0);
  await expect(page.locator("#liveSampleNoiseBtn")).toHaveCount(0);
  expect(await page.evaluate(() => typeof gsNoiseStart)).toBe("undefined");
  const text = await page.locator("#screen-live").innerText();
  expect(text).not.toMatch(/quiet|microphone|kerb|well back/i);
  expect(text).toContain("as directed by your O&M Specialist");
  expect(text).toContain("think you detect (see or hear)");
});

test("street: swipe left, tap on arrival, then the STUDENT judges; the app does not give the answer first", async ({ page }) => {
  const errors = watchErrors(page);
  await openLive(page);
  await page.click("#liveStartBtn");
  await expect(page.locator("#liveOverlay")).toBeVisible();
  await swipeOn(page, "#liveSurface", { dx: -160 });     // vehicle from the left
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("arriving");
  await expect(page.locator("#liveSurfaceText")).toContainText("Tap when it passes");   // swipes on: no buttons (12.31)
  await tick(page, 6000);                                // 6 s warning vs 4 s first half
  await swipeOn(page, "#liveSurface");                   // tap: it passed
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("judging");
  await expect(page.locator("#answerOverlay")).toBeVisible();
  expect(await history(page)).toEqual([]);               // nothing judged yet
  expect(await statusText(page, "liveOverlayStatus")).not.toMatch(/enough warning|longer than/i);
  await answerOn(page, "longer");
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", street: "half", direction: "left", sense: "hearing", judged: true, answer: "longer", expected: "longer", correct: true });
  // No result words, spoken or shown (12.29): the cue and the replay carry it.
  expect(await announcer(page)).not.toMatch(/Correct|Not quite/);
  expect(await statusText(page, "liveOverlayStatus")).not.toMatch(/Correct|Not quite/);
  await untilReady(page);
  await expect(page.locator("#liveTally")).toHaveText("Last 1 vehicle · 1 of 1 judged correctly");
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  expect(errors).toEqual([]);
});

test("street: from the right compares with the full street; a wrong answer is logged as wrong", async ({ page }) => {
  await openLive(page, { "om-live-sense": "vision" });
  await page.click("#liveStartBtn");
  await streetGesture(page, "right");
  await tick(page, 5000);                                // 5 s warning vs 8 s full street
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  const log = await history(page);
  expect(log[0]).toMatchObject({ street: "full", direction: "right", sense: "vision", expected: "shorter", answer: "longer", correct: false });
});

test("street: swipe down means it never came; noted, not scored", async ({ page }) => {
  await openLive(page);
  await page.click("#liveStartBtn");
  await swipeOn(page, "#liveSurface", { dx: 160 });
  await swipeOn(page, "#liveSurface", { dy: 160 });
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", never: true, direction: "right" });
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
  await expect(page.locator("#liveTally")).toContainText("1 never came");
});

test("street: replay 'never' gives only the right/wrong sound; 'errors' replays only after a mistake", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveReplay: "never" } }) });
  await page.evaluate(() => {
    window.__replays = 0;
    const real = window.gsReplayJudgment;
    window.gsReplayJudgment = (...a) => { window.__replays += 1; return real(...a); };
  });
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 1000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");   // wrong (it was shorter)
  await untilReady(page);
  expect(await page.evaluate(() => window.__replays)).toBe(0);

  await page.evaluate(() => {
    const f = JSON.parse(localStorage.getItem("om-features"));
    f.options.liveReplay = "errors";
    gsSaveFeatures(f);
  });
  await streetGesture(page, "left");
  await tick(page, 1000);
  await streetGesture(page, "tap");
  await answerOn(page, "shorter");  // right
  await untilReady(page);
  expect(await page.evaluate(() => window.__replays)).toBe(0);
  await streetGesture(page, "left");
  await tick(page, 1000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");   // wrong
  await untilReady(page);
  expect(await page.evaluate(() => window.__replays)).toBe(1);
});

test("street: 'how much' after a correct longer/shorter answer, with the combined replay", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveHowMuch: "on" } }) });
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 6000);
  await streetGesture(page, "tap");
  await answerOn(page, "longer");
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await expect(page.locator("#howMuchTitle")).toHaveText("How much longer?");
  await page.click("#compareFollowUpBtn");
  await tick(page, 2000);
  await page.click("#compareFollowUpBtn");
  const log = await history(page);
  expect(log).toHaveLength(2);
  expect(log[1]).toMatchObject({ activity: "live", answer: "magnitude", correct: true });
  await untilReady(page);
});

test("street: judging off records the warning time without a verdict", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveJudge: "off" } }) });
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 3000);
  await streetGesture(page, "tap");
  await expect(page.locator("#answerOverlay")).toBeHidden();
  expect((await history(page))[0]).toMatchObject({ judged: false });
  await untilReady(page);
});

test("street: Back closes the pad and leaving the screen cancels a vehicle in progress", async ({ page }) => {
  await openLive(page);
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await page.click("#liveBackBtn");
  await expect(page.locator("#liveOverlay")).toBeHidden();
  await expect(page.locator("#screenTitle")).toBeFocused();   // after Back, the screen's title (13.7)
  expect(await page.evaluate(() => document.getElementById("appMain").inert)).toBe(false);
  // Build 14 (13.7): backing out with a vehicle in progress records it as cancelled, never scored.
  let log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", direction: "left", skipped: true, skip: "vehicle", judged: false, correct: false });
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
  await page.click("#liveStartBtn");
  await streetGesture(page, "right");
  await page.evaluate(() => gsShowScreen("home"));
  await screenVisible(page, "home");
  await expect(page.locator("#liveOverlay")).toBeHidden();
  // Leaving the screen (the header's Back) still drops the vehicle unrecorded.
  log = await history(page);
  expect(log).toHaveLength(1);
});

test("street: hearing or vision is the student's choice unless the instructor fixes it", async ({ page }) => {
  await openLive(page);
  await expect(page.locator("[data-feature-choice='liveSense']")).toBeVisible();
  await openLive(page, { "om-features": JSON.stringify({ options: { liveSense: "vision" } }) });
  await expect(page.locator("[data-feature-choice='liveSense']")).toBeHidden();
  await expect(page.locator("[data-feature-fixed='liveSense']")).toHaveText("Your instructor set this to vision.");
  expect(await page.evaluate(() => gsLiveSense())).toBe("vision");
});

test("street: the 'longer does not mean long enough' note is shown", async ({ page }) => {
  await openLive(page);
  await expect(page.locator("[data-safety-note='live']")).toBeVisible();
});
