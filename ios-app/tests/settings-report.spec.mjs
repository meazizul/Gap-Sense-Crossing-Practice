import { test, expect } from "@playwright/test";
import { watchErrors, openApp, setTimes, history } from "./helpers.mjs";

test("share link v2 carries times, margin, instructor email and client code, and imports them", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await setTimes(page, "3.5", "7.2", "0.3");
  await page.click("#settingsTrigger");
  await page.fill("#instructorEmail", "oms@example.org");
  await page.locator("#instructorEmail").dispatchEvent("change");
  await page.fill("#clientCode", "ab-12x!");
  await page.locator("#clientCode").dispatchEvent("change");
  await expect(page.locator("#clientCode")).toHaveValue("AB12X");
  const link = await page.evaluate(() => buildShareTimingLink());
  expect(link).toContain("#ts=v2.");
  await page.click("#closeSettings");

  // A fresh device opens the link.
  await openApp(page);
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value, marginInput.value])).toEqual(["3.5", "7.2", "0.3"]);
  expect(await page.evaluate(() => [instructorEmailInput.value, clientCodeInput.value])).toEqual(["oms@example.org", "AB12X"]);
  expect(await page.evaluate(() => localStorage.getItem("om-demo-times"))).toBeNull();
  await expect(page.locator("#homeTimes")).toHaveText("Crossing times set");
  await expect(page.locator("#cueBannerText")).toHaveText("Time settings updated for this device.");
  expect(page.url()).not.toContain("#ts=");
  expect(errors).toEqual([]);
});

test("old v1 links still import; tampered or oversized links are rejected", async ({ page }) => {
  await openApp(page);
  const v1 = await page.evaluate(() => {
    const payload = encodeBase64Url("4|8|0.4");
    return `${location.origin}/index.html#ts=v1.${payload}.${computeShareChecksum(payload)}`;
  });
  await openApp(page);
  await page.goto(v1);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value])).toEqual(["4", "8"]);

  const bad = await page.evaluate(() => {
    const make = (raw) => { const p = encodeBase64Url(raw); return `${location.origin}/index.html#ts=v2.${p}.${computeShareChecksum(p)}`; };
    return {
      badCode: make("4|8|0.4||TOO_LONG_CODE"),
      badEmail: make("4|8|0.4|not-an-email|AB"),
      huge: make("4000|8|0.4||"),
      badSum: `${location.origin}/index.html#ts=v2.${encodeBase64Url("4|8|0.4||")}.zzzzzzz`
    };
  });
  for (const url of Object.values(bad)) {
    await openApp(page);
    await page.goto(url);
    await page.waitForFunction(() => typeof gsBoot === "function");
    expect(await page.evaluate(() => clearTimeInput.value)).toBe("");
    await expect(page.locator("#cueBannerText")).toHaveText("This time settings link is invalid.");
  }
});

test("instructor email is validated and the client code is limited to 8 letters and digits", async ({ page }) => {
  await openApp(page);
  await page.click("#settingsTrigger");
  await page.fill("#instructorEmail", "nope");
  await page.locator("#instructorEmail").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-email"))).toBeNull();
  await page.fill("#instructorEmail", "ok@example.org");
  await page.locator("#instructorEmail").dispatchEvent("change");
  expect(await page.evaluate(() => localStorage.getItem("om-instructor-email"))).toBe("ok@example.org");
  await page.fill("#clientCode", "abcdefghijk");
  await expect(page.locator("#clientCode")).toHaveValue("ABCDEFGH");
});

test("report uses the client code, never a name, and reports live vehicles as verdicts", async ({ page }) => {
  await openApp(page, { storage: {
    "om-instructor-email": "oms@example.org",
    "om-client-code": "K7",
    "om-attempt-log": JSON.stringify([
      { time: Date.now() - 1000, activity: "practice", street: "half", userSec: 4.1, refSec: 4, diffSec: 0.1, correct: true, marginSec: 0.4 },
      { time: Date.now() - 900, activity: "signal", street: "full", userSec: 7, refSec: 8, diffSec: -1, correct: false, marginSec: 0.4 },
      { time: Date.now() - 800, activity: "compare", street: "full", userSec: 9, refSec: 8, diffSec: 1, correct: false, marginSec: 0.4, answer: "same", expected: "longer" },
      { time: Date.now() - 700, activity: "compare", street: "full", userSec: 1.1, refSec: 1, diffSec: 0.1, correct: true, marginSec: 0.4, answer: "magnitude", expected: "magnitude" },
      { time: Date.now() - 600, activity: "live", street: "half", userSec: 3, refSec: 4, diffSec: -1, correct: false, marginSec: 0.4, answer: "shorter", expected: "shorter", noisy: true },
      { time: Date.now() - 500, activity: "live", street: "half", userSec: 6, refSec: 4, diffSec: 2, correct: true, marginSec: 0.4, answer: "longer", expected: "longer", noisy: false }
    ])
  } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await expect(page.locator(".progress-card")).toHaveCount(4);
  await expect(page.locator("#reportRecipient")).toContainText("oms@example.org");
  await page.click("#previewReportBtn");
  const report = await page.inputValue("#reportPreview");
  expect(report).toContain("Client code: K7");
  expect(report).not.toContain("Student:");
  expect(report).toContain("warning time -1.00s, shorter than the crossing — not enough warning [not quiet when started]");
  expect(report).toContain("warning time +2.00s, longer than the crossing — enough warning");
  expect(report).not.toMatch(/At the street.*incorrect/);
  expect(report).toContain('answered "same", it was "longer" — incorrect');
  expect(report).toContain("tapped out the difference +0.10s — within margin");
  expect(report).toContain("Timing from a signal");
  await expect(page.locator("#emailReportBtn")).toBeVisible();
  await page.click("#copyReportBtn");
  await expect(page.locator("#reportNote")).toContainText("Copied");
});

test("deleting history clears attempts and adaptive lanes", async ({ page }) => {
  await openApp(page, { storage: {
    "om-attempt-log": JSON.stringify([{ time: Date.now(), activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 }]),
    "om-adaptive-margin": JSON.stringify({ enabled: true, lanes: { "practice:half": { margin: 0.2 } } })
  } });
  await setTimes(page);
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#clearDataBtn");
  expect(await history(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("om-adaptive-margin"))).toBeNull();
  await expect(page.locator("#progressBody")).toContainText("Nothing recorded yet");
});

test("adaptive margin maths: slow tightening, full release, hard floor, per lane", async ({ page }) => {
  await openApp(page);
  await setTimes(page, "4", "8", "0.4");
  const r = await page.evaluate(() => ({
    tighten: gsAdaptiveStep(0.4, 0.9, 0.4),
    hold: gsAdaptiveStep(0.3, 0.7, 0.4),
    release: gsAdaptiveStep(0.2, 0.5, 0.4),
    floor: gsAdaptiveStep(0.1, 1, 0.4),
    neverAboveCeiling: gsAdaptiveStep(0.9, 0.7, 0.4)
  }));
  expect(r.tighten).toBeCloseTo(0.368, 3);
  expect(r.hold).toBeCloseTo(0.3, 6);
  expect(r.release).toBeCloseTo(0.4, 6);
  expect(r.floor).toBeCloseTo(0.1, 6);
  expect(r.neverAboveCeiling).toBeCloseTo(0.4, 6);

  // Ten good attempts in one lane move only that lane.
  await page.evaluate(() => {
    gsSetAdaptiveEnabled(true);
    for (let i = 0; i < 10; i += 1) {
      gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
    }
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.368, 3);
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "full"))).toBeCloseTo(0.4, 6);
  expect(await page.evaluate(() => gsEffectiveMargin("compare", "half"))).toBeCloseTo(0.4, 6);
  // Steps: 0.4 → 0.368 → 0.339 after two full windows; one bad window releases to 0.4.
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) gsLogAttempt({ activity: "practice", street: "half", userSec: 4, refSec: 4, diffSec: 0, correct: true, marginSec: 0.4 });
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.3386, 3);
  await page.evaluate(() => {
    for (let i = 0; i < 10; i += 1) gsLogAttempt({ activity: "practice", street: "half", userSec: 6, refSec: 4, diffSec: 2, correct: false, marginSec: 0.3 });
  });
  expect(await page.evaluate(() => gsEffectiveMargin("practice", "half"))).toBeCloseTo(0.4, 6);
  // Reset from Progress.
  await page.evaluate(() => gsShowScreen("progress"));
  await page.click("#resetAdaptiveBtn");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("om-adaptive-margin")).lanes)).toEqual({});
});

test("accessibility modes: visual-only, 300% text, high contrast, and reduced motion run clean", async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, { storage: { "om-a11y-output-mode": "visual-only", "om-a11y-text-size": "max", "om-a11y-high-contrast": "true" } });
  await setTimes(page);
  expect(await page.evaluate(() => document.body.classList.contains("large-text-layout"))).toBe(true);
  expect(await page.evaluate(() => document.body.classList.contains("high-contrast"))).toBe(true);
  await page.clock.install();
  await page.evaluate(() => gsShowScreen("practice"));
  await page.click("#actionBtn");
  await page.clock.runFor(4000);
  await page.click("#actionBtn");
  await page.clock.runFor(2500);
  expect(await page.evaluate(() => document.getElementById("visualReplayOverlay").dataset.active)).toBe("true");
  await page.clock.runFor(8000);
  expect(await history(page)).toHaveLength(1);
  await page.evaluate(() => gsShowScreen("compare"));
  await page.click("#compareStartBtn");
  await page.clock.runFor(12000);
  expect(errors).toEqual([]);
});
