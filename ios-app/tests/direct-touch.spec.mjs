import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick } from "./helpers.mjs";

/*
 * iPhone app, build 12: a native direct-touch area over each pad's gesture
 * surface, so swipes and taps work the same with VoiceOver on or off
 * (bug 13 in the 16 Oct 2026 report). The native side is stood in for here:
 * it records where the page asks for the area and feeds gestures back.
 */

function nativeWithDirectTouch() {
  return () => {
    window.__native = { shows: [], hides: 0, listeners: {}, keepAwake: [], stopSound: 0 };
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {
        GSNative: {
          haptic: async () => {}, pendingScreen: async () => ({}),
          tone: async () => ({ id: 1 }), sustainStart: async () => ({ id: 2 }), sustainStop: async () => {},
          stopSound: async () => { window.__native.stopSound += 1; },
          keepAwake: async ({ on }) => { window.__native.keepAwake.push(on); },
          directTouchShow: async (args) => { window.__native.shows.push(args); return { shown: true }; },
          directTouchHide: async () => { window.__native.hides += 1; },
          audioStatus: async () => ({ engineRunning: true, category: "AVAudioSessionCategoryPlayback", ignoresSilentSwitch: true, outputVolume: 1, outputLatency: 0.01, route: "Speaker", peak: 0 }),
          speak: async () => {}, stopSpeaking: async () => {},
          addListener: (name, fn) => { window.__native.listeners[name] = fn; return { remove: () => {} }; }
        },
        App: { getInfo: async () => ({ version: "1.0", build: "13" }), addListener: () => {}, getLaunchUrl: async () => ({}) },
        StatusBar: { setStyle: async () => {} }
      }
    };
  };
}

async function openLive(page, storage = {}) {
  await page.addInitScript(nativeWithDirectTouch());
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await page.waitForTimeout(150);
}

const lastShow = (page) => page.evaluate(() => window.__native.shows[window.__native.shows.length - 1]);
const gesture = (page, kind, durationMs) => page.evaluate(([k, d]) => window.__native.listeners.directTouch({ kind: k, durationMs: d }), [kind, durationMs]);

test("street pad: the native area covers the gesture surface, and its gestures drive the vehicle, timed from the touch", async ({ page }) => {
  await openLive(page);
  const show = await lastShow(page);
  const rect = await page.evaluate(() => { const r = document.getElementById("liveSurface").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  expect(show).toMatchObject(rect);
  expect(show.label).toContain("swipe left or right");
  expect(await page.evaluate(() => typeof window.__native.listeners.directTouch)).toBe("function");

  // A swipe left whose finger was down for 400 ms: detected, timed from the touch.
  const before = await page.evaluate(() => performance.now());
  await gesture(page, "left", 400);
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("arriving");
  expect(await page.evaluate(() => gsLiveState.direction)).toBe("left");
  const detectedAt = await page.evaluate(() => gsLiveState.detectedAt);
  expect(before - detectedAt).toBeGreaterThan(350);
  expect(before - detectedAt).toBeLessThan(450);

  // A tap 5 s later: arrived; the answer pad opens and the area moves to it.
  await tick(page, 5000);
  await gesture(page, "tap", 60);
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("judging");
  await page.waitForTimeout(150);
  const onAnswer = await lastShow(page);
  const answerRect = await page.evaluate(() => { const r = document.getElementById("answerSurface").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  expect(onAnswer).toMatchObject(answerRect);
  expect(onAnswer.label).toContain("swipe up for longer");

  // Swipe up = longer, which is right for a 5.4 s warning on a 4 s crossing.
  await gesture(page, "up", 120);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", answer: "longer", correct: true });
  expect(log[0].userSec).toBeGreaterThan(4.9);   // the 400 ms swipe counts; the fake clock steps coarsely
  // Back on the street pad, the area returns to the street surface.
  await page.waitForTimeout(150);
  expect((await lastShow(page)).label).toContain("swipe left or right");
  // Done hides it.
  await page.click("#liveDoneBtn");
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__native.hides)).toBeGreaterThan(0);
});

test("street pad: swipe down in the area marks the vehicle as never come", async ({ page }) => {
  await openLive(page);
  await gesture(page, "right", 200);
  await tick(page, 2000);
  await gesture(page, "down", 150);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "live", never: true, direction: "right" });
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("detect");
});

test("'how much' pad: taps in the area start and end the estimate", async ({ page }) => {
  await openLive(page, { "om-features": JSON.stringify({ options: { liveHowMuch: "on", liveReplay: "never" } }) });
  await gesture(page, "left", 100);
  await tick(page, 6000);
  await gesture(page, "tap", 50);
  await gesture(page, "up", 100);                     // longer: correct
  await tick(page, 1300);
  await expect(page.locator("#howMuchOverlay")).toBeVisible();
  await page.waitForTimeout(150);
  const show = await lastShow(page);
  expect(show.label).toContain("How much");
  const btn = await page.evaluate(() => { const r = document.getElementById("compareFollowUpBtn").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  expect(show).toMatchObject(btn);
  await gesture(page, "tap", 40);                      // start
  await tick(page, 2000);
  await gesture(page, "tap", 40);                      // end
  const log = await history(page);
  expect(log).toHaveLength(2);
  expect(log[1]).toMatchObject({ activity: "live", answer: "magnitude", correct: true });
  expect(log[1].userSec).toBeGreaterThan(1.8);
  expect(log[1].userSec).toBeLessThan(2.3);
});

test("comparison practice: the area covers the answer surface, and is hidden in buttons-only mode", async ({ page }) => {
  await page.addInitScript(nativeWithDirectTouch());
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => { gsCompareState.phase = "answering"; gsCompareState.expected = "shorter"; gsCompareState.intervalSec = 6; gsCompareState.crossingSec = 8; gsCompareState.marginSec = 0.4; gsOpenAnswerPad({ title: "x", onAnswer: gsCompareAnswer, onSkip: gsCompareSkip }); });
  await page.waitForTimeout(150);
  expect((await lastShow(page)).label).toContain("swipe up for longer");
  await gesture(page, "down", 90);
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "compare", answer: "shorter", correct: true });

  // Instructor set buttons only: no swipe surface, so no native area.
  await page.evaluate(() => gsSaveFeatures({ ...gsLoadFeatures(), options: { ...gsLoadFeatures().options, compareSwipe: "off" } }));
  const hidesBefore = await page.evaluate(() => window.__native.hides);
  await page.evaluate(() => { gsCompareState.phase = "answering"; gsOpenAnswerPad({ title: "x", onAnswer: gsCompareAnswer, onSkip: gsCompareSkip }); });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__native.hides)).toBeGreaterThan(hidesBefore);
  expect(await gesture(page, "up", 50)).toBe(false);
  expect(await history(page)).toHaveLength(1);
});

test("without the native method nothing is called and the web pads work as before", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  expect(await page.evaluate(() => gsDirectTouchSupported())).toBe(false);
  await page.evaluate(() => gsShowScreen("live"));
  await page.click("#liveStartBtn");
  await page.click("[data-live-detect='left']");
  expect(await page.evaluate(() => gsLiveState.phase)).toBe("arriving");
  await expect(page.locator("#screen-help")).toBeHidden();
  await page.evaluate(() => { gsLiveClose(); gsShowScreen("help"); });
  await expect(page.locator("#screen-help")).toContainText("Direct Touch");
});
