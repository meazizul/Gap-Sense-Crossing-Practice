import { test, expect } from "@playwright/test";
import { openApp, setTimes } from "./helpers.mjs";

/*
 * The v4 setup link (Oct 2026): sent by text, it was about 600 characters
 * with periods in the middle, and Messages could cut it short. Now it has no
 * separators, carries the features as a short code, and survives what a
 * messaging app or a copy and paste adds to it.
 */

async function instructorLink(page) {
  await openApp(page);
  await setTimes(page, "3", "6", "0.4");
  await page.evaluate(() => gsShowScreen("instructor"));
  await page.fill("#instructorEmail", "cindi@example.org");
  await page.locator("#instructorEmail").dispatchEvent("change");
  await page.fill("#clientCode", "TEST12");
  await page.locator("#clientCode").dispatchEvent("change");
  await page.selectOption("#ftCompareHowMuch", "on");
  await page.uncheck("[data-feature-activity='signal']");
  return page.evaluate(() => buildShareTimingLink());
}

async function openOnStudentPhone(page, link) {
  await openApp(page);
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function");
  return page.evaluate(() => ({
    times: [clearTimeInput.value, fullTimeInput.value, marginInput.value],
    email: instructorEmailInput.value,
    code: clientCodeInput.value,
    signal: gsActivityEnabled("signal"),
    howMuch: gsFeature("compareHowMuch")
  }));
}

const expected = { times: ["3", "6", "0.4"], email: "cindi@example.org", code: "TEST12", signal: false, howMuch: "on" };

test("the setup link has no periods in its token and fits in one text", async ({ page }) => {
  const link = await instructorLink(page);
  const token = link.split("#ts=")[1];
  expect(token).toMatch(/^4[A-Za-z0-9_-]+[a-z0-9]$/);
  // The old v3 link for the same setup was over 600 characters.
  expect(link.length).toBeLessThan(160);
  expect(link).not.toContain("@");
  expect(await openOnStudentPhone(page, link)).toEqual(expected);
});

test("the link still works with a full stop, a bracket or a line break added", async ({ page }) => {
  const link = await instructorLink(page);
  const [base, token] = link.split("#ts=");
  const variants = [
    `${link}.`,
    `${link})`,
    `${base}#ts=${token.slice(0, 40)}%0A${token.slice(40)}`,
    `${base}#ts=${token.slice(0, 40)}%20${token.slice(40)}`
  ];
  for (const variant of variants) {
    expect(await openOnStudentPhone(page, variant)).toEqual(expected);
  }
});

test("a damaged link is refused, not half applied", async ({ page }) => {
  const link = await instructorLink(page);
  const damaged = link.slice(0, -12);
  await openApp(page);
  await setTimes(page, "5", "9", "0.5");
  await page.goto(damaged);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, fullTimeInput.value])).toEqual(["5", "9"]);
  await expect(page.locator("#cueBannerText")).toHaveText("This setup link is invalid.");
});

test("v3 links sent before this build still open", async ({ page }) => {
  await openApp(page);
  const link = await page.evaluate(() => {
    const payload = encodeBase64Url(JSON.stringify({ t: ["3", "6", "0.4"], k: "OLD1", f: { activities: { live: false } } }));
    return `${location.origin}/index.html#ts=v3.${payload}.${computeShareChecksum(payload)}`;
  });
  await page.goto(link);
  await page.waitForFunction(() => typeof gsBoot === "function");
  expect(await page.evaluate(() => [clearTimeInput.value, clientCodeInput.value, gsActivityEnabled("live")])).toEqual(["3", "OLD1", false]);
});

test("the link's feature code covers every feature and every value in features.js", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const problems = [];
    const linkKeys = LINK_FEATURE_CODES.options.map(([key]) => key);
    Object.keys(GS_FEATURE_VALUES).forEach((key) => {
      const entry = LINK_FEATURE_CODES.options.find(([k]) => k === key);
      if (!entry) problems.push(`missing ${key}`);
      else if (JSON.stringify(entry[1]) !== JSON.stringify(GS_FEATURE_VALUES[key])) problems.push(`values differ for ${key}`);
    });
    linkKeys.forEach((key) => { if (!(key in GS_FEATURE_VALUES)) problems.push(`extra ${key}`); });
    if (JSON.stringify(LINK_FEATURE_CODES.activities) !== JSON.stringify(GS_ACTIVITY_IDS)) problems.push("activities differ");
    if (JSON.stringify(LINK_FEATURE_CODES.practiceModes) !== JSON.stringify(GS_MODE_IDS)) problems.push("modes differ");
    // Every value of every option survives a round trip.
    Object.entries(GS_FEATURE_VALUES).forEach(([key, values]) => values.forEach((value) => {
      const f = gsCloneFeatureDefaults();
      f.options[key] = value;
      const back = gsNormalizeFeatures(decodeLinkFeatures(encodeLinkFeatures(f)));
      if (back.options[key] !== value) problems.push(`${key}=${value} lost`);
    }));
    return problems;
  });
  expect(result).toEqual([]);
});
