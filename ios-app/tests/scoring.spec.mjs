import { test, expect } from "@playwright/test";
import { openApp, setTimes, history, tick, statusText } from "./helpers.mjs";

/*
 * Scoring and reporting treat two skills separately (Cindi's 16 Oct 2026
 * code audit): judging a sample (longer / shorter / about the same) and
 * tapping out HOW MUCH longer or shorter. One vehicle or sample is one
 * attempt even when both were recorded for it. And the replay repeats the
 * verdict already given, never a different one.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const judgment = (i, correct, street = "full") => ({
  time: 1_700_000_000_000 + i * 1000, activity: "compare", street,
  userSec: 9, refSec: 8, diffSec: 1, correct, marginSec: 0.4,
  answer: correct ? "longer" : "same", expected: "longer"
});
const howMuch = (i, correct, street = "full", activity = "compare") => ({
  time: 1_700_000_000_000 + i * 1000, activity, street,
  userSec: correct ? 1.1 : 2.5, refSec: 1, diffSec: correct ? 0.1 : 1.5, correct, marginSec: 0.4,
  answer: "magnitude", expected: "magnitude", ...(activity === "live" ? { judged: true, direction: "right", sense: "hearing" } : {})
});

test("comparison score: the last ten JUDGMENTS, even when 'how much' entries sit between them", async ({ page }) => {
  // 10 judgments (7 right), then 5 "how much" estimates (2 within margin).
  // Before the fix the window was cut first, so only 5 judgments were shown.
  const log = [];
  for (let i = 0; i < 10; i += 1) log.push(judgment(i, i < 7));
  for (let i = 0; i < 5; i += 1) log.push(howMuch(10 + i, i < 2));
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify(log) } });
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => { gsCompareState.street = "full"; gsCompareRenderScore(); });
  await expect(page.locator("#compareScore")).toHaveText(
    "Last 10: 70% correct · how much: 2 of 5 within margin · margin 0.40s"
  );
  // An older judgment outside the ten is not counted.
  await page.evaluate(() => {
    const entries = JSON.parse(localStorage.getItem("om-attempt-log"));
    entries.unshift({ ...entries[0], time: entries[0].time - 5000, correct: false });
    localStorage.setItem("om-attempt-log", JSON.stringify(entries));
    gsCompareRenderScore();
  });
  await expect(page.locator("#compareScore")).toContainText("Last 10: 70% correct");
});

test("adaptive margin: judgments and 'how much' estimates move separate lanes", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => {
    gsSetAdaptiveEnabled(true);
    for (let i = 0; i < 10; i += 1) {
      gsLogAttempt({ activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" });
    }
  });
  // Ten good judgments tighten the judgment lane only.
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "full"))).toBeCloseTo(0.368, 3);
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "full", true))).toBeCloseTo(0.4, 6);
  // Ten poor "how much" estimates leave the judgment lane where it was.
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) {
      gsLogAttempt({ activity: "compare", street: "full", userSec: 3, refSec: 1, diffSec: 2, correct: false, marginSec: 0.4, answer: "magnitude", expected: "magnitude" });
    }
  });
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "full"))).toBeCloseTo(0.368, 3);
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "full", true))).toBeCloseTo(0.4, 6);
  // Ten good estimates tighten the "how much" lane, and it has its own label.
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) {
      gsLogAttempt({ activity: "compare", street: "full", userSec: 1, refSec: 1, diffSec: 0, correct: true, marginSec: 0.4, answer: "magnitude", expected: "magnitude" });
    }
  });
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "full", true))).toBeCloseTo(0.368, 3);
  const lanes = await page.evaluate(() => Object.keys(gsLoadAdaptive().lanes).sort());
  expect(lanes).toEqual(["compare-howmuch:full", "compare:full"]);
  expect(await page.evaluate(() => gsLaneLabel("compare-howmuch:full"))).toBe("Comparison practice, how much, full street");
  // The report lists both lanes.
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("Comparison practice, full street: 0.37s");
  expect(report).toContain("Comparison practice, how much, full street: 0.37s");
});

test("one vehicle is one attempt: judgment and 'how much' are reported on separate lines, never added", async ({ page }) => {
  const log = [
    { time: 1_700_000_000_000, activity: "live", street: "full", direction: "right", sense: "hearing", judged: true,
      userSec: 10, refSec: 8, diffSec: 2, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" },
    howMuch(1, false, "full", "live"),
    { time: 1_700_000_002_000, activity: "live", street: "full", direction: "right", sense: "vision", judged: true,
      userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4, answer: "longer", expected: "shorter" },
    judgment(3, true),
    howMuch(4, true)
  ];
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify(log) } });
  await setTimes(page, "4", "8", "0.4");
  const summary = await page.evaluate(() => gsSummary());
  expect(summary.total).toBe(3);                                   // 2 vehicles + 1 sample, not 5 entries
  expect(summary.byActivity.live).toMatchObject({ total: 2, correct: 1, howMuchTotal: 1, howMuchCorrect: 0 });
  expect(summary.byActivity.compare).toMatchObject({ total: 1, correct: 1, howMuchTotal: 1, howMuchCorrect: 1 });

  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("Total attempts: 3");
  expect(report).toContain("At the street: 1/2 correct (50%)");
  expect(report).toContain("At the street, how much: 0/1 within margin (0%)");
  expect(report).toContain("Comparison practice: 1/1 correct (100%)");
  expect(report).toContain("Comparison practice, how much: 1/1 within margin (100%)");

  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator(".progress-card").nth(3)).toContainText("50%");
  await expect(page.locator(".progress-card").nth(3)).toContainText("1 of 2 correct · how much: 0 of 1 within margin");
  await expect(page.locator(".progress-card").nth(2)).toContainText("1 of 1 correct · how much: 1 of 1 within margin");
});

test("old street records (before build 7) are reported as a comparison, never as 'enough warning'", async ({ page }) => {
  const log = [
    { time: 1_700_000_000_000, activity: "live", street: "half", userSec: 6, refSec: 4, diffSec: 2, correct: true, marginSec: 0.4, answer: "longer", expected: "longer" },
    { time: 1_700_000_001_000, activity: "live", street: "half", userSec: 4.1, refSec: 4, diffSec: 0.1, correct: false, marginSec: 0.4, answer: "same", expected: "same" },
    { time: 1_700_000_002_000, activity: "live", street: "full", userSec: 6, refSec: 8, diffSec: -2, correct: false, marginSec: 0.4, answer: "shorter", expected: "shorter", noisy: true }
  ];
  await openApp(page, { storage: { "om-attempt-log": JSON.stringify(log) } });
  await setTimes(page, "4", "8", "0.4");
  const report = await page.evaluate(() => gsBuildReport());
  expect(report).toContain("warning time 6.00 s, crossing 4.00 s (2.00 s longer)");
  expect(report).toContain("warning time 4.10 s, crossing 4.00 s (0.10 s longer)");
  expect(report).toContain("warning time 6.00 s, crossing 8.00 s (2.00 s shorter) [not quiet when started]");
  expect(report).not.toMatch(/answered/);                 // never a judgment: builds before 7 did not ask one
  expect(report).not.toMatch(/enough warning|too close to rely|long enough/i);
  // Those records are kept but not scored.
  expect(await page.evaluate(() => gsSummary().total)).toBe(0);
});

test("preparation: the replay repeats the verdict already given, latency allowance included", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  await page.evaluate(() => gsShowScreen("signal"));
  await page.evaluate(() => {
    window.__cues = [];
    const real = window.gsHapticAt;
    window.gsHapticAt = (t, cue) => { window.__cues.push(cue); return real(t, cue); };
  });
  // Just past the margin, inside the 0.02 s allowance: classified as within.
  await page.evaluate(() => { gsSignalState.street = "full"; gsSignalState.phase = "timing"; gsSignalResolve(8.41); });
  const log = await history(page);
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ activity: "signal", correct: true, marginSec: 0.4 });
  const cues = await page.evaluate(() => window.__cues);
  expect(cues).toContain("reference_ok");
  expect(cues).not.toContain("reference_bad");
  await tick(page, 12000);
  expect(await statusText(page, "signalStatusText")).toBe("Ready for another.");

  // The replay helper on its own: told the verdict, it uses it.
  const direct = await page.evaluate(() => {
    const seen = [];
    window.gsHapticAt = (t, cue) => seen.push(cue);
    gsReplayProduction({ producedSec: 8.41, crossingSec: 8, marginSec: 0.4, within: true });
    const a = seen.slice();
    seen.length = 0;
    gsReplayProduction({ producedSec: 8.41, crossingSec: 8, marginSec: 0.4, within: false });
    return { a, b: seen.slice() };
  });
  expect(direct.a).toContain("reference_ok");
  expect(direct.b).toContain("reference_bad");
});
