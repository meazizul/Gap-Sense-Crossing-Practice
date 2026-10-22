import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, waitUntil, answerOn, streetGesture } from "./helpers.mjs";

/*
 * GitHub issue 11 (Cindi, build 13 website): in the Combined replay after a
 * "how much longer or shorter" estimate, the steady sound played for the
 * student's crossing time. The steady sound always stands for the warning
 * time, so the replay must play it for the sample (or the real vehicle's)
 * warning time, exactly as long as the student just heard it. These tests
 * fail on build 13 and pass after the fix.
 *
 * Agreed placement against the warning-time sound:
 *   steady sound 0 → warning time; student's sound at the crossing time and
 *   again at crossing ± estimate; right/wrong cue where the warning time ended.
 */

async function recordSounds(page) {
  await page.evaluate(() => {
    window.__sounds = [];
    const wrap = (name, kind) => {
      const real = window[name];
      window[name] = (...args) => {
        window.__sounds.push({ kind: kind(args), at: Number(name === "playCompositeTone" ? args[2] : name === "playFeedbackTone" ? args[1] : args[0]) || 0, len: name === "playCompositeTone" ? args[1] : 0 });
        return real(...args);
      };
    };
    wrap("playFeedbackTone", (a) => a[0]);
    wrap("playUserMarkerTone", () => "user");
    wrap("playCompositeTone", (a) => (a[4] === "steady" ? "sample" : "tone"));
  });
}

/** The replay's sounds, as offsets from the start of the steady sound. */
async function replaySounds(page) {
  const sounds = await page.evaluate(() => window.__sounds.filter((s) => s.kind !== "tone"));
  const steady = sounds.filter((s) => s.kind === "sample");
  expect(steady, "exactly one steady sound in the replay").toHaveLength(1);
  const base = steady[0];
  const users = sounds.filter((s) => s.kind === "user").map((s) => s.at - base.at).sort((a, b) => a - b);
  // At the street gives the right/wrong sound at once, before the replay; only the cue inside the replay counts here.
  const cues = sounds.filter((s) => (s.kind === "acceptable" || s.kind === "outside") && s.at >= base.at);
  expect(cues, "exactly one right/wrong cue inside the replay").toHaveLength(1);
  return { steadyLen: base.len, users, cueAt: cues[0].at - base.at, cueKind: cues[0].kind };
}

async function openCompare(page) {
  await openApp(page, { storage: { "om-compareFollowUp": "true" } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("input[name='compareStreet'][value='full']");   // build 14: First half is the default (F6)
}

async function playUntilAnswering(page) {
  await page.click("#compareStartBtn");
  for (let i = 0; i < 100; i += 1) {
    await page.clock.runFor(200);
    if (await page.evaluate(() => gsCompareState.phase === "answering")) break;
  }
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("answering");
}

async function compareReplay(page, roll, answer, estimateMs) {
  await openCompare(page);
  await page.evaluate((r) => { Math.random = () => r; }, roll);
  await playUntilAnswering(page);
  const { crossingSec, sampleSec } = await page.evaluate(() => ({ crossingSec: gsCompareState.crossingSec, sampleSec: gsCompareState.intervalSec }));
  await answerOn(page, answer);
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await recordSounds(page);
  await page.click("#compareFollowUpBtn");
  await tick(page, estimateMs);
  await page.click("#compareFollowUpBtn");
  const log = await history(page);
  expect(log[1]).toMatchObject({ answer: "magnitude" });
  const replay = await replaySounds(page);
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
  return { crossingSec, sampleSec, estimateSec: log[1].userSec, correct: log[1].correct, ...replay };
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("issue 11, longer: the steady sound is the warning time; student's sound at the crossing and at crossing + estimate; cue where the sample ended", async ({ page }) => {
  const r = await compareReplay(page, 0.99, "longer", 2500);
  expect(r.sampleSec).toBeGreaterThan(r.crossingSec);
  expect(r.steadyLen).toBeCloseTo(r.sampleSec, 3);          // never the crossing time (8 s)
  expect(r.steadyLen).not.toBeCloseTo(r.crossingSec, 1);
  expect(r.users).toHaveLength(2);
  expect(r.users[0]).toBeCloseTo(r.crossingSec, 2);
  expect(r.users[1]).toBeCloseTo(r.crossingSec + r.estimateSec, 2);
  expect(r.cueAt).toBeCloseTo(r.sampleSec, 2);
  expect(r.cueKind).toBe(r.correct ? "acceptable" : "outside");
});

test("issue 11, shorter: the steady sound is the warning time; student's second sound at crossing - estimate", async ({ page }) => {
  const r = await compareReplay(page, 0.1, "shorter", 1500);
  expect(r.sampleSec).toBeLessThan(r.crossingSec);
  expect(r.steadyLen).toBeCloseTo(r.sampleSec, 3);
  expect(r.users).toHaveLength(2);
  expect(r.users[0]).toBeCloseTo(Math.max(0, r.crossingSec - r.estimateSec), 2);
  expect(r.users[1]).toBeCloseTo(r.crossingSec, 2);
  expect(r.cueAt).toBeCloseTo(r.sampleSec, 2);
});

test("issue 11, status line and setup note describe the new order", async ({ page }) => {
  await openCompare(page);
  const note = await page.locator("#screen-instructor .setup-note", { hasText: "Combined:" }).innerText();
  expect(note).toContain("steady sound for the sample warning time");
  expect(note).not.toContain("steady sound for the crossing time");
});

test("issue 11, At the street: the combined replay after a real vehicle plays the steady sound for the warning time", async ({ page }) => {
  await page.addInitScript(() => {
    const fake = { speaking: false, cancel() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 5); }, getVoices() { return []; } };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await openApp(page, { storage: { "om-features": JSON.stringify({ options: { liveHowMuch: "on", liveReplay: "always" } }) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await streetGesture(page, "left");
  await tick(page, 6000);
  await streetGesture(page, "tap");
  const { warningSec, crossingSec, category } = await page.evaluate(() => ({ warningSec: gsLiveState.warningSec, crossingSec: gsLiveState.crossingSec, category: gsLiveState.category }));
  expect(["longer", "shorter"]).toContain(category);
  await answerOn(page, category);
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await recordSounds(page);
  await page.click("#compareFollowUpBtn");
  await tick(page, 2000);
  await page.click("#compareFollowUpBtn");
  await tick(page, 2500);                                  // the replay is scheduled ~1.6 s after the estimate
  const log = await history(page);
  expect(log[1]).toMatchObject({ activity: "live", answer: "magnitude" });
  const r = await replaySounds(page);
  expect(r.steadyLen).toBeCloseTo(warningSec, 3);
  expect(r.steadyLen).not.toBeCloseTo(crossingSec, 1);
  const estimateAt = Math.max(0, category === "shorter" ? crossingSec - log[1].userSec : crossingSec + log[1].userSec);
  expect(r.users.sort((a, b) => a - b)).toEqual([Math.min(crossingSec, estimateAt), Math.max(crossingSec, estimateAt)].map((v) => expect.closeTo(v, 2)));
  expect(r.cueAt).toBeCloseTo(warningSec, 2);
  await waitUntil(page, () => gsLiveState.phase === "detect", { ms: 40000, step: 250 });
});
