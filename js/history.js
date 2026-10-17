/* ============================================================
 * Gap Sense — attempt history, adaptive margin, and reporting
 * ============================================================
 *
 * Every practice attempt is recorded here so that:
 *   1. the adaptive margin-of-error can shape difficulty over time;
 *   2. the instructor can see progress at a lesson;
 *   3. the student can (opt-in) send a summary to their instructor.
 *
 * Everything stays in localStorage on the student's own device. Nothing is
 * transmitted anywhere unless the student explicitly chooses to share it.
 * ============================================================ */

const GS_HISTORY_KEY = "om-attempt-log";
const GS_HISTORY_LIMIT = 800; // ~ a year of heavy practice; old entries roll off

/**
 * One attempt.
 * @typedef {Object} GsAttempt
 * @property {number} time        epoch ms
 * @property {string} activity    "practice" | "signal" | "compare" | "live"
 *                                ("measure" appears only in logs from builds
 *                                before 10 Oct 2026)
 * @property {string} street      "half" | "full"
 * @property {number} userSec     what the student produced/judged
 * @property {number} refSec      the reference they were judged against
 * @property {number} diffSec     signed: positive = student was long
 * @property {boolean} correct    within the margin in force at the time
 * @property {number} marginSec   the margin in force at the time
 * @property {string} [answer]    comparison tasks: "longer"|"shorter"|"same",
 *                                or "magnitude" for a "how much" estimate
 * @property {string} [expected]  comparison tasks: the true category
 * @property {boolean} [noisy]    live task, builds before 7 only
 * @property {string} [direction] live task: "left" | "right"
 * @property {string} [sense]     live task: "hearing" | "vision"
 * @property {boolean} [judged]   live task: the student judged it (build 7+)
 * @property {boolean} [never]    live task: the vehicle never came
 */

function gsLoadHistory() {
  try {
    const raw = localStorage.getItem(GS_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function gsSaveHistory(entries) {
  try {
    const trimmed = entries.slice(-GS_HISTORY_LIMIT);
    localStorage.setItem(GS_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    /* storage full or unavailable — practice must still work */
  }
}

function gsLogAttempt(entry) {
  const entries = gsLoadHistory();
  entries.push({ time: Date.now(), ...entry });
  gsSaveHistory(entries);
  gsUpdateAdaptiveMargin(entry.activity, entry.street, gsIsMagnitude(entry));
  return entries.length;
}

function gsClearHistory() {
  try {
    localStorage.removeItem(GS_HISTORY_KEY);
    localStorage.removeItem(GS_ADAPTIVE_KEY);
  } catch (error) {
    /* ignore */
  }
}

/*
 * Two skills are recorded under one activity: judging a sample (longer,
 * shorter, about the same) and tapping out HOW MUCH longer or shorter. They
 * are scored, adapted and reported separately (Cindi, 16 Oct 2026).
 */
function gsIsMagnitude(entry) {
  return entry.answer === "magnitude";
}

/**
 * Attempts for an activity and street. `magnitude` narrows to one skill:
 * true = only "how much" estimates, false = only judgments and timings,
 * undefined = both. The filter runs BEFORE the window is cut, so "last 10"
 * means the last ten of that skill.
 */
function gsHistoryFor(activity, street, limit = 0, magnitude) {
  const all = gsLoadHistory().filter(
    (e) => (!activity || e.activity === activity)
      && (!street || e.street === street)
      && (magnitude === undefined || gsIsMagnitude(e) === magnitude)
  );
  return limit > 0 ? all.slice(-limit) : all;
}

function gsAccuracy(entries) {
  if (!entries.length) return null;
  const correct = entries.filter((e) => e.correct).length;
  return correct / entries.length;
}

/* ============================================================
 * ADAPTIVE MARGIN OF ERROR
 * ------------------------------------------------------------
 * Cindi's request, and the maths she asked for help with.
 *
 * The idea is behavioral shaping / zone of proximal development: hold the
 * student just past comfortable, but never so tight that the task becomes
 * impossible and demoralising.
 *
 *   CEILING  the margin the instructor set (default 0.40 s). The task never
 *            gets easier than this — it is the clinical target.
 *   FLOOR    a hard 0.10 s. Below this we would be measuring the student's
 *            reaction time and the touchscreen's latency, not their sense of
 *            duration, so tightening further would teach nothing.
 *   WINDOW   the last 10 attempts of the same activity, skill and street type.
 *
 * STATUS: EXPERIMENTAL, off by default. Cindi's review: there is
 * no research support for the window, the step or the stopping rule, and the
 * first version "pinned the learner down" and tightened too fast. What is
 * kept, per her notes:
 *
 *   - one margin PER TASK, SKILL AND STREET TYPE (a "lane"), never one
 *     overall; reproducing an interval, judging one, and tapping out a
 *     difference are different skills, and a 3 s half street is not an 8 s
 *     full street. "How much" estimates have their own lane
 *     ("compare-howmuch:full"), separate from the longer/shorter judgments;
 *   - tighten slowly (x 0.92 per window) and release quickly: a bad window
 *     goes straight back to the instructor's margin, not to a pinned level;
 *   - there is no learner floor any more; nothing holds a student down.
 *
 * Rules, evaluated after each attempt once the window is full:
 *
 *   accuracy >= 80%   tighten:  margin x 0.92, never below the hard floor
 *   accuracy <  60%   release:  margin = the instructor's margin (ceiling)
 *   60-80%            hold
 * ============================================================ */

const GS_ADAPTIVE_KEY = "om-adaptive-margin";
const GS_ADAPTIVE = {
  windowSize: 10,
  tightenAt: 0.8,
  loosenBelow: 0.6,
  factor: 0.92,
  hardFloor: 0.1
};

/* Activities whose attempts can move an adaptive lane. */
const GS_ADAPTIVE_ACTIVITIES = ["practice", "signal", "compare"];

function gsAdaptiveDefaults() {
  return {
    enabled: false,
    // per "activity:street" key
    lanes: {}
  };
}

function gsLoadAdaptive() {
  try {
    const raw = localStorage.getItem(GS_ADAPTIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return gsAdaptiveDefaults();
    return { ...gsAdaptiveDefaults(), ...parsed, lanes: parsed.lanes || {} };
  } catch (error) {
    return gsAdaptiveDefaults();
  }
}

function gsSaveAdaptive(state) {
  try {
    localStorage.setItem(GS_ADAPTIVE_KEY, JSON.stringify(state));
  } catch (error) {
    /* ignore */
  }
}

function gsAdaptiveEnabled() {
  return gsLoadAdaptive().enabled === true;
}

function gsSetAdaptiveEnabled(on) {
  const state = gsLoadAdaptive();
  state.enabled = Boolean(on);
  gsSaveAdaptive(state);
}

function gsLaneKey(activity, street, magnitude = false) {
  return `${activity || "practice"}${magnitude ? "-howmuch" : ""}:${street || "full"}`;
}

function gsCeilingMargin() {
  // The instructor-set margin is always the ceiling.
  const value = Number(typeof marginInput !== "undefined" ? marginInput.value : 0.4);
  return Number.isFinite(value) && value > 0 ? value : 0.4;
}

function gsLane(state, activity, street, magnitude = false) {
  const key = gsLaneKey(activity, street, magnitude);
  if (!state.lanes[key]) {
    state.lanes[key] = {
      margin: gsCeilingMargin(),
      attemptsSinceStep: 0
    };
  }
  if (!Number.isFinite(state.lanes[key].attemptsSinceStep)) state.lanes[key].attemptsSinceStep = 0;
  return state.lanes[key];
}

/**
 * The margin actually in force right now for a given activity/street, and
 * skill (`magnitude` true = the "how much" lane).
 * Falls back to the instructor's fixed margin when adaptive mode is off.
 */
function gsEffectiveMargin(activity, street, magnitude = false) {
  const ceiling = gsCeilingMargin();
  const state = gsLoadAdaptive();
  if (!state.enabled) return ceiling;
  const lane = gsLane(state, activity, street, magnitude);
  // The ceiling can be edited at any time; never let a stored value exceed it.
  const margin = Number.isFinite(lane.margin) ? lane.margin : ceiling;
  return Math.min(ceiling, Math.max(GS_ADAPTIVE.hardFloor, margin));
}

/**
 * Pure step function, separated so it can be unit-tested without storage.
 * Returns the new margin for a lane given the window accuracy.
 */
function gsAdaptiveStep(currentMargin, accuracy, ceiling) {
  const bounded = Math.min(ceiling, Math.max(GS_ADAPTIVE.hardFloor, currentMargin));
  if (accuracy >= GS_ADAPTIVE.tightenAt) {
    return Math.max(GS_ADAPTIVE.hardFloor, bounded * GS_ADAPTIVE.factor);
  }
  if (accuracy < GS_ADAPTIVE.loosenBelow) {
    return ceiling;
  }
  return bounded;
}

/**
 * Re-evaluate the lane after an attempt. Safe to call unconditionally.
 */
function gsUpdateAdaptiveMargin(activity, street, magnitude = false) {
  const state = gsLoadAdaptive();
  if (!state.enabled) return;
  if (!GS_ADAPTIVE_ACTIVITIES.includes(activity)) return;

  const lane = gsLane(state, activity, street, magnitude);

  // Evaluate in blocks of `windowSize` attempts, never a sliding window. The
  // first version re-evaluated after every attempt once ten existed, so a
  // student doing well was tightened on attempt 11, 12, 13… — the "reducing
  // too quickly" Cindi saw. Now a lane moves at most once per ten attempts.
  lane.attemptsSinceStep += 1;
  if (lane.attemptsSinceStep < GS_ADAPTIVE.windowSize) {
    gsSaveAdaptive(state);
    return;
  }
  // Only this lane's own skill counts: a student who tells longer from
  // shorter but cannot yet tap out the difference is not mixed into one score.
  const block = gsHistoryFor(activity, street, GS_ADAPTIVE.windowSize, magnitude);
  lane.margin = gsAdaptiveStep(lane.margin, gsAccuracy(block), gsCeilingMargin());
  lane.attemptsSinceStep = 0;
  gsSaveAdaptive(state);
}

/** Instructor action: forget every lane and start again from the set margin. */
function gsResetAdaptiveLanes() {
  const state = gsLoadAdaptive();
  state.lanes = {};
  gsSaveAdaptive(state);
}

/* ============================================================
 * PROGRESS SUMMARY + INSTRUCTOR REPORT
 * ============================================================ */

const GS_ACTIVITY_LABELS = {
  practice: "Practice my timing",
  signal: "Comparison preparation",
  compare: "Comparison practice",
  live: "At the street",
  measure: "Crossing measured" // legacy entries from builds before 10 Oct 2026
};

const GS_STREET_LABELS = { half: "First half", full: "Full street" };

const GS_LANE_LABELS = {
  "practice:half": "Practice my timing, first half",
  "practice:full": "Practice my timing, full street",
  "signal:half": "Comparison preparation, first half",
  "signal:full": "Comparison preparation, full street",
  "compare:half": "Comparison practice, first half",
  "compare:full": "Comparison practice, full street",
  "compare-howmuch:half": "Comparison practice, how much, first half",
  "compare-howmuch:full": "Comparison practice, how much, full street"
};

function gsLaneLabel(key) {
  return GS_LANE_LABELS[key] || key;
}

/*
 * Which entries count towards a score. At the street, only vehicles the
 * student judged (build 7 and later) are right or wrong; vehicles that never
 * came, unjudged vehicles, and entries from earlier builds (where "correct"
 * meant "gave enough warning") are kept in the log but not scored.
 */
function gsIsScored(entry) {
  if (entry.activity !== "live") return true;
  return entry.judged === true && !entry.never;
}

/*
 * One vehicle (or one sample) is one attempt. A "how much" estimate that
 * follows a correct judgment is a second entry in the log, but it is the same
 * encounter, so it is counted on its own line (howMuchTotal / howMuchCorrect)
 * and never added to `total` or `correct`.
 */
function gsSummary() {
  const all = gsLoadHistory().filter(gsIsScored);
  const byActivity = {};
  let encounters = 0;
  all.forEach((entry) => {
    const key = entry.activity;
    if (!byActivity[key]) byActivity[key] = { total: 0, correct: 0, howMuchTotal: 0, howMuchCorrect: 0, last: 0 };
    const stats = byActivity[key];
    if (gsIsMagnitude(entry)) {
      stats.howMuchTotal += 1;
      if (entry.correct) stats.howMuchCorrect += 1;
    } else {
      encounters += 1;
      stats.total += 1;
      if (entry.correct) stats.correct += 1;
    }
    stats.last = Math.max(stats.last, entry.time || 0);
  });

  // The phone's own date, not UTC: an evening's practice in New York is one
  // day, not two (Cindi, 16 Oct 2026).
  const days = new Set(all.map((entry) => gsLocalDay(entry.time)));

  return {
    total: encounters,
    daysPracticed: days.size,
    firstAt: all.length ? all[0].time : null,
    lastAt: all.length ? all[all.length - 1].time : null,
    byActivity
  };
}

function gsLocalDay(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gsFormatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/**
 * Plain-text report for the instructor. Deliberately readable in any email
 * client, with no attachment and no tracking.
 */
function gsBuildReport(options = {}) {
  const summary = gsSummary();
  const lines = [];
  lines.push("Gap Sense — practice report");
  lines.push("=".repeat(34));
  // A short code, never a name: the report travels by plain email.
  if (options.clientCode) lines.push(`Student code: ${options.clientCode}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");

  // Entries that are kept but not scored (a vehicle that never came, a
  // warning time recorded with judging off, records from older builds) still
  // belong in the report, so only an empty log means nothing to report.
  if (!gsLoadHistory().length) {
    lines.push("No practice recorded yet.");
    return lines.join("\n");
  }

  lines.push(`Total attempts: ${summary.total}`);
  lines.push(`Days practiced: ${summary.daysPracticed}`);
  lines.push(`First: ${gsFormatDate(summary.firstAt)}`);
  lines.push(`Most recent: ${gsFormatDate(summary.lastAt)}`);
  lines.push("");

  lines.push("By activity");
  lines.push("-".repeat(34));
  Object.entries(summary.byActivity).forEach(([activity, stats]) => {
    const label = GS_ACTIVITY_LABELS[activity] || activity;
    if (activity === "measure") {
      lines.push(`${label}: ${stats.total} measurement(s)`);
      return;
    }
    if (stats.total) {
      const pct = Math.round((stats.correct / stats.total) * 100);
      const noun = activity === "practice" || activity === "signal" ? "within margin" : "correct";
      lines.push(`${label}: ${stats.correct}/${stats.total} ${noun} (${pct}%)`);
    }
    if (stats.howMuchTotal) {
      // The same vehicles or samples, a different skill: reported on its own
      // line so the two are never added together.
      const pct = Math.round((stats.howMuchCorrect / stats.howMuchTotal) * 100);
      lines.push(`${label}, how much: ${stats.howMuchCorrect}/${stats.howMuchTotal} within margin (${pct}%)`);
    }
  });
  lines.push("");

  // Recent trend, most recent last — useful at a lesson.
  const recent = gsLoadHistory().slice(-15);
  lines.push("Most recent attempts");
  lines.push("-".repeat(34));
  recent.forEach((entry) => {
    const label = GS_ACTIVITY_LABELS[entry.activity] || entry.activity;
    const street = GS_STREET_LABELS[entry.street] || entry.street || "";
    const when = new Date(entry.time).toLocaleDateString();
    if (entry.activity === "measure") {
      lines.push(`${when}  ${label} (${street}): ${entry.userSec.toFixed(2)}s`);
      return;
    }
    const sign = (entry.diffSec || 0) >= 0 ? "+" : "";
    const diffText = `${sign}${Number(entry.diffSec || 0).toFixed(2)}s`;
    if (entry.activity === "live" && (entry.judged !== undefined || entry.never)) {
      const from = entry.direction ? `from the ${entry.direction}` : "";
      const by = entry.sense ? `by ${entry.sense}` : "";
      const context = [from, by].filter(Boolean).join(", ");
      const where = `${label} (${street}${context ? `, ${context}` : ""})`;
      if (entry.never) {
        lines.push(`${when}  ${where}: vehicle never came`);
        return;
      }
      if (entry.answer === "magnitude") {
        const mark = entry.correct ? "within margin" : "outside margin";
        lines.push(`${when}  ${where}: tapped out the difference ${diffText} — ${mark}`);
        return;
      }
      if (!entry.judged) {
        lines.push(`${when}  ${where}: warning time ${diffText} against the crossing (not judged)`);
        return;
      }
      const mark = entry.correct ? "correct" : "incorrect";
      lines.push(`${when}  ${where}: warning time ${diffText}; answered "${entry.answer}", it was "${entry.expected}" — ${mark}`);
      return;
    }
    if (entry.activity === "live") {
      // Builds before 7 recorded the comparison without a judgment. Only
      // the comparison is reported: the app never says whether a warning
      // time was enough to cross on. That is the instructor's call.
      const verdict = {
        longer: "longer than the crossing",
        same: "about the same as the crossing",
        shorter: "shorter than the crossing"
      }[entry.expected] || entry.expected;
      const noisy = entry.noisy ? " [not quiet when started]" : "";
      lines.push(`${when}  ${label} (${street}): warning time ${diffText}, ${verdict}${noisy}`);
      return;
    }
    if (entry.activity === "compare") {
      if (entry.answer === "magnitude") {
        const mark = entry.correct ? "within margin" : "outside margin";
        lines.push(`${when}  ${label} (${street}): tapped out the difference ${diffText} — ${mark}`);
        return;
      }
      const mark = entry.correct ? "correct" : "incorrect";
      lines.push(
        `${when}  ${label} (${street}): answered "${entry.answer}", it was "${entry.expected}" — ${mark}`
      );
      return;
    }
    const mark = entry.correct ? "within margin" : "outside margin";
    lines.push(`${when}  ${label} (${street}): ${diffText} — ${mark}`);
  });

  const adaptive = gsLoadAdaptive();
  if (adaptive.enabled) {
    lines.push("");
    lines.push("Adaptive margin (experimental, current per task)");
    lines.push("-".repeat(34));
    Object.entries(adaptive.lanes).forEach(([key, lane]) => {
      lines.push(`${gsLaneLabel(key)}: ${Number(lane.margin).toFixed(2)}s (set margin ${gsCeilingMargin().toFixed(2)}s)`);
    });
  }

  lines.push("");
  lines.push("Sent by the student from Gap Sense. No data leaves the device unless sent.");
  return lines.join("\n");
}
