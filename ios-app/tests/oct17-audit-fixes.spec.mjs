import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick } from "./helpers.mjs";

/*
 * Regressions for the bugs the Oct 17, 2026 audit found in build 12 (bug
 * numbers from the shared test-results doc). Each fails on build 12.
 */

test.beforeEach(async ({ page }) => { await page.clock.install(); });

/* On screen and the thing a finger would hit. */
const reachable = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => !el.closest("[hidden]")).map((el) => {
  const r = el.getBoundingClientRect();
  const onScreen = r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5;
  return onScreen && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
}), sel);

for (const size of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
  test(`bug 24: in landscape ${size.width}x${size.height}, every street and answer control can be reached`, async ({ page }) => {
    await page.setViewportSize(size);
    await openApp(page);
    await setTimes(page, "4", "8", "0.4");
    await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
    await tick(page, 100);
    expect(await reachable(page, "#liveDoneBtn, #liveDetectButtons .answer-btn")).toEqual([true, true, true]);
    await page.evaluate(() => gsLiveDetect("left"));
    expect(await reachable(page, "#liveArriveButtons .answer-btn")).toEqual([true, true]);
    await page.evaluate(() => gsLiveArrived());
    await tick(page, 100);
    expect(await reachable(page, "#answerSkipBtn, #answerOverlay .answer-btn")).toEqual([true, true, true, true]);
  });
}

test("bug 28: with the answer pad over the street pad, only the answer pad can be reached", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); gsLiveDetect("left"); gsLiveArrived(); });
  expect(await page.evaluate(() => document.getElementById("liveOverlay").inert)).toBe(true);
  await page.focus("#answerOverlay .answer-btn[data-answer='shorter']");
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.getElementById("liveOverlay").contains(document.activeElement))).toBe(false);
  }
  await page.click("#answerSkipBtn");
  expect(await page.evaluate(() => document.getElementById("liveOverlay").inert)).toBe(false);
  expect(await page.evaluate(() => document.getElementById("liveOverlay").contains(document.activeElement))).toBe(true);
});

async function prepAttempt(page, outputMode, pressAtSec) {
  await page.addInitScript(() => {
    Object.defineProperty(AudioContext.prototype, "outputLatency", { get: () => 0.3, configurable: true });
    Object.defineProperty(AudioContext.prototype, "baseLatency", { get: () => 0, configurable: true });
  });
  await openApp(page, { storage: { "om-a11y-output-mode": outputMode } });
  await setTimes(page, "2", "4", "0.1");
  await page.evaluate(() => { ensureAudioContext(); gsShowScreen("signal"); gsSignalState.street = "full"; gsSignalState.phase = "timing"; gsSignalState.signalAt = performance.now(); });
  await tick(page, pressAtSec * 1000);
  await page.evaluate(() => gsSignalPress());
  return (await history(page)).at(-1);
}

test("bug 29: with visual-only feedback, an on-time stop is not corrected for the sound delay", async ({ page }) => {
  const entry = await prepAttempt(page, "visual-only", 4.0);
  expect(entry.userSec).toBeCloseTo(4.0, 1);
  expect(entry.correct).toBe(true);
});

test("bug 29: with sound, a stop 0.3 s late through a 0.3 s delay is on time", async ({ page }) => {
  const entry = await prepAttempt(page, "audio-only", 4.3);
  expect(entry.userSec).toBeCloseTo(4.0, 1);
  expect(entry.correct).toBe(true);
});

test("bug 30: replay B keeps the first replay's visuals", async ({ page }) => {
  await openApp(page, { storage: { "om-a11y-output-mode": "audio-visual", "om-features": JSON.stringify({ options: { magnitudeReplay: "b" } }) } });
  await setTimes(page, "2", "4", "0.4");
  await page.evaluate(() => {
    gsShowScreen("compare");
    Object.assign(gsCompareState, { street: "full", intervalSec: 6, crossingSec: 4, expected: "longer", phase: "howmuch" });
    gsCompareHowMuchDone(2);
  });
  await tick(page, 300);
  const types = await page.evaluate(() => visualReplayState.events.map((e) => e.type));
  expect(types).toContain("sample");
  expect(types.filter((t) => t === "user").length).toBeGreaterThanOrEqual(3);
  expect(types).toContain("reference");
});

test("bug 31: changing street during a replay, or leaving the street pad, stops its sounds", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("compare"); Object.assign(gsCompareState, { intervalSec: 9, crossingSec: 8, expected: "longer" }); gsCompareReplay(); });
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await page.evaluate(() => gsCompareSetStreet("half"));
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
  await page.evaluate(() => {
    gsShowScreen("live"); document.getElementById("liveStartBtn").click();
    gsLiveDetect("left"); gsLiveState.warningSec = 5; gsLiveState.crossingSec = 4;
    gsReplayJudgment({ sampleSec: 5, crossingSec: 4, startDelaySec: 0.3 });
  });
  expect(await page.evaluate(() => scheduledSounds.length)).toBeGreaterThan(0);
  await page.click("#liveDoneBtn");
  expect(await page.evaluate(() => scheduledSounds.length)).toBe(0);
});

test("bug 32: a margin of 0, or no margin, is refused with a reason, not turned into 0.4 s", async ({ page }) => {
  await openApp(page);
  for (const margin of ["0", ""]) {
    await setTimes(page, "4", "8", margin);
    const r = await page.evaluate(() => ({ ok: gsHasTimes(), problem: gsSetupProblem() }));
    expect(r.ok).toBe(false);
    expect(r.problem).toMatch(/margin of error/);
  }
});

test("bug 33: impossible times are refused, and an accepted setup survives its own link", async ({ page }) => {
  await openApp(page);
  for (const [c, f, m] of [["601", "602", "61"], ["8", "4", "0.4"]]) {
    await setTimes(page, c, f, m);
    expect(await page.evaluate(() => gsHasTimes())).toBe(false);
  }
  await setTimes(page, "3.5", "7", "0.3");
  expect(await page.evaluate(() => gsHasTimes())).toBe(true);
  const ok = await page.evaluate(() => parseShareToken(buildShareTimingToken({ times: true, contact: false, features: false, lock: false })));
  expect(ok.times).toEqual(["3.5", "7", "0.3"]);
});

test("bug 34: the crossing-time fields' borders are at least 3:1 against their background", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await openApp(page, { storage: { "om-a11y-theme": theme } });
    await page.evaluate(() => gsShowScreen("instructor"));
    const ratio = await page.evaluate(() => {
      const parse = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const input = document.getElementById("clearTime");
      let bgEl = input.parentElement;
      while (bgEl && getComputedStyle(bgEl).backgroundColor === "rgba(0, 0, 0, 0)") bgEl = bgEl.parentElement;
      const a = lum(parse(getComputedStyle(input).borderTopColor));
      const b = lum(parse(getComputedStyle(bgEl || document.body).backgroundColor));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(3);
  }
});

test("bug 35: deleting history clears the report preview", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 });
    gsShowScreen("progress");
    gsPreviewReport();
  });
  expect(await page.evaluate(() => document.getElementById("reportPreview").value)).toContain("Practice my timing");
  await page.evaluate(() => gsClearData());
  expect(await page.evaluate(() => document.getElementById("reportPreview").value)).toBe("");
  await expect(page.locator("#reportPreviewWrap")).toBeHidden();
});

test("bug 36: when copying fails, the app does not say it copied", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    document.execCommand = () => false;
    navigator.share = undefined;
  });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.click("#shareTimingSettings");
  await expect(page.locator("#shareNote")).toContainText("Could not copy");
  await page.evaluate(() => { gsLogAttempt({ activity: "practice", street: "full", userSec: 8, refSec: 8, diffSec: 0, correct: true, marginSec: 0.4 }); gsShowScreen("progress"); });
  await page.evaluate(() => gsCopyReport());
  await expect(page.locator("#reportNote")).toContainText("Could not copy");
});

test("bug 38: iPhone: the Direct Touch area follows the street surface after a vehicle is detected", async ({ page }) => {
  await page.addInitScript(() => {
    window.__shows = [];
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {
      GSNative: { haptic: async () => {}, pendingScreen: async () => ({}), tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 2 }), sustainStop: async () => {}, stopSound: async () => {}, keepAwake: async () => {},
        directTouchShow: async (a) => { window.__shows.push(a); return { shown: true }; }, directTouchHide: async () => {},
        audioStatus: async () => ({ outputVolume: 1, outputLatency: 0.01 }), speak: async () => {}, stopSpeaking: async () => {}, addListener: () => ({ remove() {} }) },
      App: { getInfo: async () => ({}), addListener: () => {}, getLaunchUrl: async () => ({}) }, StatusBar: { setStyle: async () => {} }
    } };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsShowScreen("live"); document.getElementById("liveStartBtn").click(); });
  await tick(page, 150);
  await page.evaluate(() => gsLiveDetect("left"));
  await tick(page, 150);
  const [show, rect] = await page.evaluate(() => {
    const r = document.getElementById("liveSurface").getBoundingClientRect();
    return [window.__shows.at(-1), { x: r.left, y: r.top, width: r.width, height: r.height }];
  });
  expect(show.y).toBeCloseTo(rect.y, 0);
  expect(show.height).toBeCloseTo(rect.height, 0);
});
