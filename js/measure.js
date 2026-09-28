/* ============================================================
 * Gap Sense — Measure my crossing  (the "establish" step)
 * ============================================================
 *
 * Why this exists
 * ---------------
 * Before a student can practise recalling how long their crossing takes, they
 * need to know how long it actually takes. Until now that number came from an
 * instructor standing at the kerb with a stopwatch, and was typed into Settings
 * by hand. That made the very first step of the process the one place where
 * the whole method still depended on counting seconds — and it meant a student
 * could never set themselves up at a new street on their own.
 *
 * This mode captures it directly: walk the crossing, tap at each point, repeat
 * a few times, and the app stores the average as the reference time. It then
 * plays the duration straight back so the student begins building the felt
 * sense immediately, without ever being told a number.
 * ============================================================ */

const GS_MEASURE_TRIALS_KEY = "om-measure-trials";
const GS_MEASURE_MIN_TRIALS = 3;      // below this, the average is not trustworthy
const GS_MEASURE_SPREAD_WARN = 0.75;  // seconds of spread that suggests inconsistency

const gsMeasureState = {
  plan: "both",      // "both" | "half" | "full"
  running: false,
  startedAt: 0,
  taps: [],          // seconds since start
  trials: []         // [{ clearSec, fullSec, at }]
};

function gsMeasurePlanSteps(plan) {
  if (plan === "half") return ["Step off", "Clear of near lane"];
  if (plan === "full") return ["Step off", "Far side"];
  return ["Step off", "Clear of near lane", "Far side"];
}

function gsLoadMeasureTrials() {
  try {
    const raw = localStorage.getItem(GS_MEASURE_TRIALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function gsSaveMeasureTrials(trials) {
  try {
    localStorage.setItem(GS_MEASURE_TRIALS_KEY, JSON.stringify(trials.slice(-20)));
  } catch (error) {
    /* ignore */
  }
}

function gsMean(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function gsSpread(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  return Math.max(...nums) - Math.min(...nums);
}

/* ---------------- flow ---------------- */

function gsMeasureReset(message = "") {
  gsMeasureState.running = false;
  gsMeasureState.taps = [];
  gsMeasureState.startedAt = 0;
  gsMeasureUpdateButton();
  gsMeasureRender();
  if (message) gsMeasureStatus(message);
}

function gsMeasureStatus(message, tone = "neutral") {
  const el = document.getElementById("measureStatus");
  const text = document.getElementById("measureStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  announceScreenReader(message);
}

function gsMeasureUpdateButton() {
  const btn = document.getElementById("measureBtn");
  const label = document.getElementById("measureBtnLabel");
  const hint = document.getElementById("measureBtnHint");
  if (!btn || !label) return;

  const steps = gsMeasurePlanSteps(gsMeasureState.plan);
  if (!gsMeasureState.running) {
    label.textContent = steps[0].toUpperCase();
    if (hint) hint.textContent = "Tap as you step off the kerb";
    btn.classList.remove("running");
    btn.classList.add("idle");
    btn.setAttribute("aria-label", `${steps[0]}. Tap as you step off the kerb.`);
    return;
  }
  const next = steps[gsMeasureState.taps.length];
  label.textContent = (next || "DONE").toUpperCase();
  if (hint) hint.textContent = "Tap when you reach it";
  btn.classList.remove("idle");
  btn.classList.add("running");
  btn.setAttribute("aria-label", `${next}. Tap when you reach it.`);
}

function gsMeasureTap() {
  ensureAudioContext();

  if (!gsMeasureState.running) {
    gsMeasureState.running = true;
    gsMeasureState.startedAt = performance.now();
    gsMeasureState.taps = [0];
    playConfirmTone();
    hapticCue("start");
    gsMeasureUpdateButton();
    gsMeasureStatus("Walking. Tap at each point.");
    return;
  }

  const elapsed = (performance.now() - gsMeasureState.startedAt) / 1000;
  gsMeasureState.taps.push(elapsed);
  playConfirmTone();
  hapticCue("marker");

  const steps = gsMeasurePlanSteps(gsMeasureState.plan);
  if (gsMeasureState.taps.length < steps.length) {
    gsMeasureUpdateButton();
    gsMeasureStatus(`${steps[gsMeasureState.taps.length - 1]} recorded.`);
    return;
  }

  gsMeasureCommitTrial();
}

function gsMeasureCommitTrial() {
  const taps = gsMeasureState.taps;
  const plan = gsMeasureState.plan;
  const trial = { at: Date.now(), clearSec: null, fullSec: null };

  if (plan === "both") {
    trial.clearSec = taps[1];
    trial.fullSec = taps[2];
  } else if (plan === "half") {
    trial.clearSec = taps[1];
  } else {
    trial.fullSec = taps[1];
  }

  gsMeasureState.trials.push(trial);
  gsSaveMeasureTrials(gsMeasureState.trials);

  // Log it so the instructor report shows how the times were established.
  if (Number.isFinite(trial.clearSec)) {
    gsLogAttempt({
      activity: "measure", street: "half",
      userSec: trial.clearSec, refSec: trial.clearSec, diffSec: 0,
      correct: true, marginSec: 0
    });
  }
  if (Number.isFinite(trial.fullSec)) {
    gsLogAttempt({
      activity: "measure", street: "full",
      userSec: trial.fullSec, refSec: trial.fullSec, diffSec: 0,
      correct: true, marginSec: 0
    });
  }

  gsMeasureState.running = false;
  gsMeasureState.taps = [];
  gsMeasureUpdateButton();
  gsMeasureRender();

  const count = gsMeasureState.trials.length;
  const remaining = GS_MEASURE_MIN_TRIALS - count;
  if (remaining > 0) {
    gsMeasureStatus(
      `Crossing recorded. ${remaining} more ${remaining === 1 ? "walk" : "walks"} for a reliable average.`
    );
  } else {
    gsMeasureStatus("Crossing recorded. Hear it, or save these times.", "ok");
  }
  // Let them feel what they just walked.
  setTimeout(() => gsMeasurePlayback(), 600);
}

/* ---------------- results ---------------- */

function gsMeasureAverages() {
  const clears = gsMeasureState.trials.map((t) => t.clearSec).filter(Number.isFinite);
  const fulls = gsMeasureState.trials.map((t) => t.fullSec).filter(Number.isFinite);
  return {
    clearSec: gsMean(clears),
    fullSec: gsMean(fulls),
    clearSpread: gsSpread(clears),
    fullSpread: gsSpread(fulls),
    clearCount: clears.length,
    fullCount: fulls.length
  };
}

function gsMeasureRender() {
  const list = document.getElementById("measureTrialList");
  const summary = document.getElementById("measureSummary");
  const saveBtn = document.getElementById("measureSaveBtn");
  const playBtn = document.getElementById("measurePlayBtn");
  if (!list || !summary) return;

  list.innerHTML = "";
  gsMeasureState.trials.forEach((trial, index) => {
    const row = document.createElement("li");
    row.className = "trial-row";
    const parts = [];
    if (Number.isFinite(trial.clearSec)) parts.push(`clear ${trial.clearSec.toFixed(2)}s`);
    if (Number.isFinite(trial.fullSec)) parts.push(`full ${trial.fullSec.toFixed(2)}s`);
    row.innerHTML = `<span class="trial-index">Walk ${index + 1}</span>
      <span class="trial-values">${parts.join(" · ")}</span>`;
    list.appendChild(row);
  });

  const avg = gsMeasureAverages();
  const hasAny = avg.clearSec !== null || avg.fullSec !== null;
  if (saveBtn) saveBtn.disabled = !hasAny;
  if (playBtn) playBtn.disabled = !hasAny;

  if (!hasAny) {
    summary.innerHTML = "<p class=\"field-help\">No walks recorded yet.</p>";
    return;
  }

  const bits = [];
  if (avg.clearSec !== null) {
    bits.push(`<div class="stat"><span class="stat-label">Clear from left</span>
      <span class="stat-value">${avg.clearSec.toFixed(2)}s</span>
      <span class="stat-note">${avg.clearCount} walk${avg.clearCount === 1 ? "" : "s"}</span></div>`);
  }
  if (avg.fullSec !== null) {
    bits.push(`<div class="stat"><span class="stat-label">Full street</span>
      <span class="stat-value">${avg.fullSec.toFixed(2)}s</span>
      <span class="stat-note">${avg.fullCount} walk${avg.fullCount === 1 ? "" : "s"}</span></div>`);
  }

  let warning = "";
  const worstSpread = Math.max(avg.clearSpread, avg.fullSpread);
  if (gsMeasureState.trials.length < GS_MEASURE_MIN_TRIALS) {
    warning = `<p class="field-help">Take at least ${GS_MEASURE_MIN_TRIALS} walks — a single walk is rarely representative.</p>`;
  } else if (worstSpread > GS_MEASURE_SPREAD_WARN) {
    warning = `<p class="field-help warn">Your walks vary by ${worstSpread.toFixed(2)}s.
      That is a wide spread — consider walking at a more consistent pace, or discarding and starting again.</p>`;
  }

  summary.innerHTML = `<div class="stat-row">${bits.join("")}</div>${warning}`;
}

function gsMeasurePlayback() {
  const avg = gsMeasureAverages();
  const seconds = avg.fullSec ?? avg.clearSec;
  if (!Number.isFinite(seconds)) return;
  // Mark the start and the end of the measured duration, nothing in between:
  // the gap between the two tones IS the information.
  ensureAudioContext();
  playUserMarkerTone(0.25);
  playFeedbackTone("acceptable", 0.25 + seconds);
  if (typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(0.25, seconds);
  }
  gsMeasureStatus("Listen: that gap is how long your crossing takes.");
}

function gsMeasureSave() {
  const avg = gsMeasureAverages();
  if (avg.clearSec === null && avg.fullSec === null) return;

  if (avg.clearSec !== null) {
    const value = avg.clearSec.toFixed(2);
    clearTimeInput.value = value;
    localStorage.setItem("om-clear-time", value);
  }
  if (avg.fullSec !== null) {
    const value = avg.fullSec.toFixed(2);
    fullTimeInput.value = value;
    localStorage.setItem("om-full-time", value);
  }

  refreshTimingRequirementPrompt();
  updateNextPrompt();
  gsMeasureStatus("Saved. These are now your crossing times.", "ok");
  hapticCue("reference_ok");
}

function gsMeasureDiscard() {
  gsMeasureState.trials = [];
  gsSaveMeasureTrials([]);
  gsMeasureReset("Walks cleared.");
}

function gsMeasureSetPlan(plan) {
  gsMeasureState.plan = plan;
  gsMeasureReset();
  gsMeasureStatus(`Measuring: ${gsMeasurePlanSteps(plan).join(" → ")}`);
}

function gsMeasureInit() {
  gsMeasureState.trials = gsLoadMeasureTrials();

  const btn = document.getElementById("measureBtn");
  if (btn) btn.addEventListener("click", gsMeasureTap);

  document.querySelectorAll("input[name='measurePlan']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsMeasureSetPlan(input.value);
    });
  });

  const saveBtn = document.getElementById("measureSaveBtn");
  if (saveBtn) saveBtn.addEventListener("click", gsMeasureSave);

  const playBtn = document.getElementById("measurePlayBtn");
  if (playBtn) playBtn.addEventListener("click", gsMeasurePlayback);

  const discardBtn = document.getElementById("measureDiscardBtn");
  if (discardBtn) discardBtn.addEventListener("click", gsMeasureDiscard);

  gsMeasureUpdateButton();
  gsMeasureRender();
}
