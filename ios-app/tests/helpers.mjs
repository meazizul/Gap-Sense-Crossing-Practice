import { expect } from "@playwright/test";

/** Collect every console error and page error so a test can assert none. */
export function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

/** Open the app fresh: clear storage, mark the tutorial seen, reload. */
export async function openApp(page, { query = "", tutorialSeen = true, storage = {} } = {}) {
  await page.goto(`/index.html${query}`);
  // No service worker between tests: a cache-first worker would serve stale
  // files after an edit and hide the very bugs these tests look for.
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
  await page.evaluate(({ tutorialSeen, storage }) => {
    localStorage.clear();
    if (tutorialSeen) localStorage.setItem("om-tutorial-seen", "true");
    Object.entries(storage).forEach(([k, v]) => localStorage.setItem(k, v));
  }, { tutorialSeen, storage });
  await page.goto(`/index.html${query}`);
  await page.waitForFunction(() => typeof gsBoot === "function" && document.getElementById("screen-home"));
}

/** Set crossing times through the public engine API, as Settings or a link would. */
export async function setTimes(page, clear = "4", full = "8", margin = "0.4") {
  await page.evaluate(([c, f, m]) => setReferenceTimes(c, f, m, { source: "settings" }), [clear, full, margin]);
}

export async function screenVisible(page, name) {
  await expect(page.locator(`#screen-${name}`)).toBeVisible();
  for (const other of ["home", "practice", "signal", "compare", "live", "progress", "help"]) {
    if (other !== name) await expect(page.locator(`#screen-${other}`)).toBeHidden();
  }
}

export async function history(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("om-attempt-log") || "[]"));
}

export async function announcer(page) {
  return page.evaluate(() => document.getElementById("srAnnouncer").textContent.replace(/​/g, ""));
}

/** Advance the fake clock in steps, giving timers and rAF a chance to run. */
export async function tick(page, ms, step = 250) {
  let left = ms;
  while (left > 0) {
    const d = Math.min(step, left);
    await page.clock.runFor(d);
    left -= d;
  }
}

export async function statusText(page, id) {
  return page.locator(`#${id}`).innerText();
}

/** Poll a page condition while advancing the fake clock (waitForFunction cannot, under page.clock). */
export async function waitUntil(page, fn, { ms = 10000, step = 100 } = {}) {
  let left = ms;
  while (left > 0) {
    if (await page.evaluate(fn)) return;
    await page.clock.runFor(step);
    left -= step;
  }
  throw new Error("condition not met in time");
}
