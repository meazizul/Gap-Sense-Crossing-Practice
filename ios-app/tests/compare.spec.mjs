import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, screenVisible, history, tick, announcer, statusText, waitUntil } from "./helpers.mjs";

async function openCompare(page, storage = {}) {
  await openApp(page, { storage });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("compare"));
  await page.evaluate(() => { document.querySelector("#screen-compare details.options-card").open = true; });
}

/** Replays last up to ~2 x the longest sample; wait for idle rather than guessing. */
async function untilIdle(page) {
  await waitUntil(page, () => gsCompareState.phase === "idle", { ms: 45000, step: 250 });
}

async function playUntilAnswering(page) {
  await page.click("#compareStartBtn");
  await expect(page.locator("#compareStartBtn")).toBeDisabled();
  // Sample lengths are bounded by gsBuildTrial (up to 1.8 x the crossing); 20 s covers the longest.
  for (let i = 0; i < 100; i += 1) {
    await page.clock.runFor(200);
    if (await page.evaluate(() => gsCompareState.phase === "answering")) break;
  }
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("answering");
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("wording: sample warning time, never 'gap'", async ({ page }) => {
  await openCompare(page);
  await expect(page.locator("#compareStartBtn")).toHaveText("Play a sample warning time");
  const text = await page.locator("#screen-compare").innerText();
  expect(text.toLowerCase()).not.toMatch(/\bgap\b/);
});

test("a trial waits for the answer, replays, and does not start another by itself", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await playUntilAnswering(page);
  await expect(page.locator(".answer-btn[data-answer='same']")).toBeEnabled();
  await expect(page.locator(".answer-btn[data-answer='same']")).toBeFocused();
  await expect(page.locator("#compareSwipePad")).toBeVisible();
  expect(await announcer(page)).toContain("Was that longer, shorter, or about the same");

  const expected = await page.evaluate(() => gsCompareState.expected);
  const wrong = expected === "longer" ? "shorter" : "longer";
  await page.click(`.answer-btn[data-answer='${wrong}']`);

  // The correct answer is announced before speech is suppressed for the replay.
  expect(await announcer(page)).toMatch(/^It was .* Feel the difference\.$/);
  await expect(page.locator("#compareSwipePad")).toBeHidden();
  let log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "compare", answer: wrong, expected, correct: false, marginSec: 0.4 });

  await untilIdle(page);
  await expect(page.locator("#compareStartBtn")).toBeEnabled();
  await expect(page.locator(".answer-btn[data-answer='same']")).toBeDisabled();
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  await tick(page, 10000);
  log = await history(page);
  expect(log).toHaveLength(1);                          // no auto-advance
  await expect(page.locator("#compareScore")).toContainText("Last 1: 0% correct");
  expect(errors).toEqual([]);
});

test("a correct answer is also followed by the replay", async ({ page }) => {
  await openCompare(page);
  await playUntilAnswering(page);
  const expected = await page.evaluate(() => gsCompareState.expected);
  await page.click(`.answer-btn[data-answer='${expected}']`);
  expect(await announcer(page)).toMatch(/^Correct\. It was .* Now feel it\.$/);
  await tick(page, 1500);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await untilIdle(page);
  await expect(page.locator("#compareScore")).toContainText("Last 1: 100% correct");
});

test("swipe up answers longer, swipe down answers shorter, tap answers same", async ({ page }) => {
  await openCompare(page);
  for (const [dy, answer] of [[-120, "longer"], [120, "shorter"], [0, "same"]]) {
    await playUntilAnswering(page);
    await page.locator("#compareSwipePad").scrollIntoViewIfNeeded();
    const box = await page.locator("#compareSwipePad").boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    if (dy) await page.mouse.move(x, y + dy, { steps: 4 });
    await page.mouse.up();
    const log = await history(page);
    expect(log[log.length - 1].answer).toBe(answer);
    await untilIdle(page);
  }
  expect(await history(page)).toHaveLength(3);          // a swipe never double-answers
});

test("arrow keys on the focused pad answer longer and shorter", async ({ page }) => {
  await openCompare(page);
  await playUntilAnswering(page);
  await page.focus("#compareSwipePad");
  await page.keyboard.press("ArrowUp");
  expect((await history(page))[0].answer).toBe("longer");
  await untilIdle(page);
  await playUntilAnswering(page);
  await page.focus("#compareSwipePad");
  await page.keyboard.press("ArrowDown");
  expect((await history(page))[1].answer).toBe("shorter");
});

test("random pause delays the sample", async ({ page }) => {
  await openCompare(page, { "om-compareRandomDelay": "true" });
  await expect(page.locator("#compareRandomDelay")).toBeChecked();
  await page.click("#compareStartBtn");
  expect(await announcer(page)).toContain("after a short pause");
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("waiting");
  await tick(page, 4000);
  expect(["playing", "answering"]).toContain(await page.evaluate(() => gsCompareState.phase));
});

test("'how much' step runs before the replay and logs the estimate", async ({ page }) => {
  await openCompare(page, { "om-compareFollowUp": "true" });
  // Force a trial with a clear difference so the step is offered.
  await page.evaluate(() => { Math.random = () => 0.99; });
  await playUntilAnswering(page);
  const { expected, trueDiff } = await page.evaluate(() => ({
    expected: gsCompareState.expected,
    trueDiff: Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec)
  }));
  expect(trueDiff).toBeGreaterThan(0.2);
  await page.click(`.answer-btn[data-answer='${expected}']`);
  await tick(page, 1200);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("howmuch");
  await expect(page.locator("#compareFollowUpWrap")).toBeVisible();
  await expect(page.locator("#compareFollowUpBtn")).toHaveText("TAP TO START");
  await page.click("#compareFollowUpBtn");
  await expect(page.locator("#compareFollowUpBtn")).toHaveText("TAP TO END");
  await tick(page, Math.round(trueDiff * 1000));
  await page.click("#compareFollowUpBtn");
  const log = await history(page);
  expect(log).toHaveLength(2);
  expect(log[1]).toMatchObject({ answer: "magnitude", correct: true });
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("replaying");
  await untilIdle(page);
  await expect(page.locator("#compareFollowUpWrap")).toBeHidden();
  expect(await statusText(page, "compareStatusText")).toContain("Your estimate was close");
  // The score line counts judgements only, not estimates.
  await expect(page.locator("#compareScore")).toContainText("Last 1:");
});

test("leaving mid-trial cancels everything", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await page.click("#compareStartBtn");
  await page.clock.runFor(600);
  await page.click("#backBtn");
  await screenVisible(page, "home");
  await tick(page, 15000);
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => gsCompareState.phase)).toBe("idle");
  expect(await page.evaluate(() => suppressSrAnnouncements)).toBe(false);
  await page.evaluate(() => gsShowScreen("compare"));
  await expect(page.locator("#compareStartBtn")).toBeEnabled();
  await expect(page.locator(".answer-btn[data-answer='same']")).toBeDisabled();
  expect(errors).toEqual([]);
});

test("pressing Play again restarts cleanly instead of overlapping", async ({ page }) => {
  await openCompare(page);
  await playUntilAnswering(page);
  await page.evaluate(() => gsCompareBegin());          // as if Play were pressed again
  await tick(page, 400);
  expect(await page.evaluate(() => gsCompareState.phase)).not.toBe("answering");
  await expect(page.locator(".answer-btn[data-answer='same']")).toBeDisabled();
  expect(await history(page)).toEqual([]);
});

test("sample loudness slider persists and the preview plays", async ({ page }) => {
  const errors = watchErrors(page);
  await openCompare(page);
  await page.locator("#sampleVolume").fill("60");
  await page.locator("#sampleVolume").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-sample-volume"))).toBe("0.6");
  await expect(page.locator("#sampleVolumeOut")).toHaveText("60%");
  await page.click("#previewSampleBtn");
  await tick(page, 3000);
  expect(errors).toEqual([]);
});

test("trials are always self-consistent", async ({ page }) => {
  await openCompare(page);
  const bad = await page.evaluate(() => {
    let mismatches = 0;
    for (let i = 0; i < 2000; i += 1) {
      const crossing = 2 + Math.random() * 10;
      const margin = 0.1 + Math.random() * 0.5;
      const trial = gsBuildTrial(crossing, margin);
      if (trial.category !== gsClassifyInterval(trial.interval, crossing, margin)) mismatches += 1;
      if (trial.interval < 0.5) mismatches += 1;
    }
    return mismatches;
  });
  expect(bad).toBe(0);
});
