/* ============================================================
 * Gap Sense — Comparison tasks
 * ============================================================
 *
 * Knowing your own crossing time is the prerequisite skill. The skill it is a
 * prerequisite *for* is this one: judging whether the warning time of an
 * approaching vehicle — the gap between first hearing it and it reaching you —
 * is longer or shorter than the time you need to cross.
 *
 * Two modes, matching the two in the feature proposal:
 *
 *   PRACTICE  anywhere, no traffic. The app plays a synthetic interval and the
 *             student judges it against their crossing time.
 *   LIVE      at a real kerb. The student taps when they detect a vehicle and
 *             again when it passes; the app measures the real warning time and
 *             gives the same judgement immediately.
 *
 * In both, a wrong answer is followed by hearing the two durations back to
 * back, so the error is felt rather than described.
 * ============================================================ */

/* ============================================================
 * Shared
 * ============================================================ */

const GS_ANSWERS = ["shorter", "same", "longer"];

const GS_ANSWER_LABELS = {
  shorter: "Shorter than my crossing",
  same: "About the same",
  longer: "Longer than my crossing"
};

/**
 * Mark the two ends of an interval by touch. For a DeafBlind traveller this is
 * the whole channel: they cannot hear the tone or see the shape, so the only
 * thing carrying the duration is the time between two pulses on their hand.
 */
const gsHapticTimers = [];

function gsHapticAt(delaySec, cue) {
  gsHapticTimers.push(setTimeout(() => hapticCue(cue), Math.max(0, delaySec) * 1000));
}

function gsClearHaptics() {
  while (gsHapticTimers.length) clearTimeout(gsHapticTimers.pop());
}

function gsFeelInterval(startDelaySec, durationSec, endCue = "marker") {
  gsHapticAt(startDelaySec, "marker");
  gsHapticAt(startDelaySec + durationSec, endCue);
}

function gsCrossingTimeFor(street) {
  const times = getTimingInputs();
  return street === "half" ? times.clearTime : times.fullTime;
}

/** True category of an interval relative to the crossing time. */
function gsClassifyInterval(intervalSec, crossingSec, marginSec) {
  const diff = intervalSec - crossingSec;
  if (Math.abs(diff) <= marginSec) return "same";
  return diff > 0 ? "longer" : "shorter";
}

/**
 * Play an interval as either one continuous tone or two ticks with silence
 * between them. Cindi wanted both available — a continuous sound reads as "a
 * vehicle approaching", two ticks read as "two events" — with a toggle,
 * because which is more intuitive is genuinely an open question.
 */
function gsPlayInterval(intervalSec, startDelaySec = 0, style = "continuous") {
  ensureAudioContext();
  if (style === "ticks") {
    playUserMarkerTone(startDelaySec);
    playUserMarkerTone(startDelaySec + intervalSec);
  } else {
    // One sustained tone whose *length* is the information.
    playCompositeTone(
      [{ freq: 392, gain: 0.34 }, { freq: 466, gain: 0.22 }],
      intervalSec,
      startDelaySec,
      TEST_TUNING.userVolume
    );
  }
  if (typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(startDelaySec, intervalSec);
  }
  gsFeelInterval(startDelaySec, intervalSec);
}

/** Replay the judged interval and then the true crossing time, back to back. */
function gsReplayComparison(intervalSec, crossingSec, style) {
  const gap = 0.9;
  gsPlayInterval(intervalSec, 0.3, style);
  const secondStart = 0.3 + intervalSec + gap;
  // The reference uses the feedback voice so the two are never confused.
  playFeedbackTone("acceptable", secondStart);
  playFeedbackTone("acceptable", secondStart + crossingSec);
  if (typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(secondStart, crossingSec, "acceptable");
  }
  gsFeelInterval(secondStart, crossingSec, "reference_ok");
  return secondStart + crossingSec + 0.6;
}

function gsIntervalStyle() {
  const checked = document.querySelector("input[name='gsIntervalStyle']:checked");
  return checked ? checked.value : "continuous";
}

/* ============================================================
 * PRACTICE COMPARISON
 * ============================================================ */

const gsCompareState = {
  street: "full",
  intervalSec: 0,
  crossingSec: 0,
  expected: "same",
  awaiting: false,
  followUp: false,
  followUpStart: 0
};

function gsCompareMargin() {
  return gsEffectiveMargin("compare", gsCompareState.street);
}

/**
 * Build a trial. Categories are drawn evenly so the student cannot learn a
 * base rate, and the magnitude is scaled to the crossing time so the task
 * stays proportionally as hard on a wide street as a narrow one.
 */
function gsBuildTrial(crossingSec, marginSec) {
  const category = GS_ANSWERS[Math.floor(Math.random() * GS_ANSWERS.length)];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  let interval;

  if (category === "same") {
    // Inside the margin, but rarely dead-on — that would be too easy.
    interval = crossingSec + rand(-marginSec * 0.85, marginSec * 0.85);
  } else if (category === "longer") {
    interval = crossingSec + rand(marginSec * 1.4, Math.max(marginSec * 2.2, crossingSec * 0.8));
  } else {
    const floor = Math.max(0.6, crossingSec * 0.35);
    interval = Math.max(floor, crossingSec - rand(marginSec * 1.4, Math.max(marginSec * 2.2, crossingSec * 0.55)));
  }

  return { interval: Math.max(0.5, interval), category };
}

function gsCompareStatus(message, tone = "neutral") {
  const el = document.getElementById("compareStatus");
  const text = document.getElementById("compareStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  announceScreenReader(message);
}

function gsCompareSetAnswersEnabled(enabled) {
  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function gsCompareNewTrial() {
  gsClearHaptics();
  const crossingSec = gsCrossingTimeFor(gsCompareState.street);
  if (!Number.isFinite(crossingSec) || crossingSec <= 0) {
    gsCompareStatus("Set your crossing times first — measure them or enter them in Settings.", "warn");
    return;
  }

  const margin = gsCompareMargin();
  const trial = gsBuildTrial(crossingSec, margin);
  gsCompareState.intervalSec = trial.interval;
  gsCompareState.crossingSec = crossingSec;
  gsCompareState.expected = gsClassifyInterval(trial.interval, crossingSec, margin);
  gsCompareState.awaiting = true;
  gsCompareState.followUp = false;

  gsCompareSetAnswersEnabled(false);
  gsCompareStatus("Listen…");
  suppressSrAnnouncements = true;
  gsPlayInterval(trial.interval, 0.45, gsIntervalStyle());

  setTimeout(() => {
    suppressSrAnnouncements = false;
    gsCompareSetAnswersEnabled(true);
    gsCompareStatus("Was that longer, shorter, or about the same as your crossing?");
  }, (0.45 + trial.interval + 0.35) * 1000);
}

function gsCompareAnswer(answer) {
  if (!gsCompareState.awaiting) return;
  gsCompareState.awaiting = false;
  gsCompareSetAnswersEnabled(false);

  const correct = answer === gsCompareState.expected;
  const diff = gsCompareState.intervalSec - gsCompareState.crossingSec;

  gsLogAttempt({
    activity: "compare",
    street: gsCompareState.street,
    userSec: gsCompareState.intervalSec,
    refSec: gsCompareState.crossingSec,
    diffSec: diff,
    correct,
    marginSec: gsCompareMargin(),
    answer,
    expected: gsCompareState.expected
  });

  gsCompareRenderScore();

  if (correct) {
    playFeedbackTone("acceptable", 0.05);
    hapticCue("reference_ok");
    gsCompareStatus("Correct.", "ok");
    if (document.getElementById("compareFollowUp")?.checked) {
      setTimeout(() => gsCompareStartFollowUp(), 900);
    } else {
      setTimeout(() => gsCompareNewTrial(), 1400);
    }
    return;
  }

  playFeedbackTone("outside", 0.05);
  hapticCue("reference_bad");
  gsCompareStatus(
    `That was ${GS_ANSWER_LABELS[gsCompareState.expected].toLowerCase()}. Listen to the difference…`,
    "warn"
  );
  suppressSrAnnouncements = true;
  const doneAt = gsReplayComparison(
    gsCompareState.intervalSec,
    gsCompareState.crossingSec,
    gsIntervalStyle()
  );
  setTimeout(() => {
    suppressSrAnnouncements = false;
    gsCompareStatus("First the interval, then your crossing time. Ready for another.");
  }, (doneAt + 0.2) * 1000);
}

/* Optional follow-up: "how much longer/shorter was it?" — the student holds the
 * difference in mind and taps it out, which is the same felt-duration skill
 * applied to a gap rather than a crossing. */
function gsCompareStartFollowUp() {
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  if (trueDiff < 0.2) {
    gsCompareNewTrial();
    return;
  }
  gsCompareState.followUp = true;
  gsCompareState.followUpStart = 0;
  const btn = document.getElementById("compareFollowUpBtn");
  const wrap = document.getElementById("compareFollowUpWrap");
  if (wrap) wrap.hidden = false;
  if (btn) btn.textContent = "TAP TO START";
  gsCompareStatus("Now tap out how much longer or shorter it was: tap to start, tap to end.");
}

function gsCompareFollowUpTap() {
  const btn = document.getElementById("compareFollowUpBtn");
  if (!gsCompareState.followUp) return;

  if (!gsCompareState.followUpStart) {
    gsCompareState.followUpStart = performance.now();
    playConfirmTone();
    hapticCue("start");
    if (btn) btn.textContent = "TAP TO END";
    return;
  }

  const produced = (performance.now() - gsCompareState.followUpStart) / 1000;
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  const margin = gsCompareMargin();
  const correct = Math.abs(produced - trueDiff) <= margin;

  playConfirmTone();
  gsCompareState.followUp = false;
  gsCompareState.followUpStart = 0;
  const wrap = document.getElementById("compareFollowUpWrap");
  if (wrap) wrap.hidden = true;

  gsLogAttempt({
    activity: "compare",
    street: gsCompareState.street,
    userSec: produced,
    refSec: trueDiff,
    diffSec: produced - trueDiff,
    correct,
    marginSec: margin,
    answer: "magnitude",
    expected: "magnitude"
  });

  suppressSrAnnouncements = true;
  playUserMarkerTone(0.25);
  playUserMarkerTone(0.25 + produced);
  playFeedbackTone(correct ? "acceptable" : "outside", 0.25 + produced + 0.8);
  playFeedbackTone(correct ? "acceptable" : "outside", 0.25 + produced + 0.8 + trueDiff);
  hapticCue(correct ? "reference_ok" : "reference_bad");
  gsCompareStatus(correct ? "Close." : "Listen to the two gaps.", correct ? "ok" : "warn");

  setTimeout(() => {
    suppressSrAnnouncements = false;
    gsCompareRenderScore();
    gsCompareNewTrial();
  }, (0.25 + produced + 0.8 + trueDiff + 1.2) * 1000);
}

function gsCompareRenderScore() {
  const el = document.getElementById("compareScore");
  if (!el) return;
  const window = gsHistoryFor("compare", gsCompareState.street, 10);
  const accuracy = gsAccuracy(window);
  const margin = gsCompareMargin();
  const marginNote = gsAdaptiveEnabled()
    ? ` · margin ${margin.toFixed(2)}s (adaptive)`
    : ` · margin ${margin.toFixed(2)}s`;
  el.textContent = accuracy === null
    ? `No attempts yet${marginNote}`
    : `Last ${window.length}: ${Math.round(accuracy * 100)}% correct${marginNote}`;
}

function gsCompareSetStreet(street) {
  gsCompareState.street = street;
  gsCompareRenderScore();
  gsCompareStatus(`${street === "half" ? "Half street" : "Full street"} selected. Start when ready.`);
}

/* ============================================================
 * AMBIENT NOISE
 * ------------------------------------------------------------
 * How quiet it is, is the single biggest factor in how early a vehicle can be
 * heard. A warning time sampled while a bus idles nearby is not a warning time
 * the student can rely on. So: sample the quiet first, then flag any trial
 * started while it is noticeably louder than that baseline.
 * ============================================================ */

const GS_NOISE_KEY = "om-noise-baseline";
const GS_NOISE_MARGIN_DB = 6; // how far above baseline counts as "not quiet"

const gsNoise = {
  stream: null,
  analyser: null,
  data: null,
  baselineDb: null,
  lastDb: null,
  rafId: null
};

function gsLoadNoiseBaseline() {
  const raw = localStorage.getItem(GS_NOISE_KEY);
  const value = raw === null ? NaN : Number(raw);
  gsNoise.baselineDb = Number.isFinite(value) ? value : null;
  return gsNoise.baselineDb;
}

function gsCurrentDb() {
  if (!gsNoise.analyser || !gsNoise.data) return null;
  gsNoise.analyser.getFloatTimeDomainData(gsNoise.data);
  let sum = 0;
  for (let i = 0; i < gsNoise.data.length; i += 1) sum += gsNoise.data[i] * gsNoise.data[i];
  const rms = Math.sqrt(sum / gsNoise.data.length);
  // -100 dB floor keeps silence from producing -Infinity.
  return Math.max(-100, 20 * Math.log10(rms || 1e-10));
}

async function gsNoiseStart() {
  if (gsNoise.analyser) return true;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = ensureAudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser); // analyser only; never routed to the speakers
    gsNoise.stream = stream;
    gsNoise.analyser = analyser;
    gsNoise.data = new Float32Array(analyser.fftSize);
    const tick = () => {
      gsNoise.lastDb = gsCurrentDb();
      gsNoise.rafId = requestAnimationFrame(tick);
    };
    tick();
    return true;
  } catch (error) {
    return false;
  }
}

function gsNoiseStop() {
  if (gsNoise.rafId !== null) cancelAnimationFrame(gsNoise.rafId);
  gsNoise.rafId = null;
  gsNoise.stream?.getTracks().forEach((track) => track.stop());
  gsNoise.stream = null;
  gsNoise.analyser = null;
  gsNoise.data = null;
}

async function gsNoiseSampleBaseline() {
  const ok = await gsNoiseStart();
  const note = document.getElementById("liveNoiseNote");
  if (!ok) {
    if (note) note.textContent = "Microphone unavailable — noise checking is off.";
    return;
  }
  if (note) note.textContent = "Sampling the quiet… stay still for 3 seconds.";
  const samples = [];
  const started = Date.now();
  const collect = () => {
    const db = gsCurrentDb();
    if (db !== null) samples.push(db);
    if (Date.now() - started < 3000) {
      setTimeout(collect, 100);
      return;
    }
    samples.sort((a, b) => a - b);
    // Median is robust against a single cough or passing car during sampling.
    const median = samples[Math.floor(samples.length / 2)];
    gsNoise.baselineDb = median;
    localStorage.setItem(GS_NOISE_KEY, String(median));
    gsLiveRenderNoise();
    announceScreenReader("Quiet level recorded.");
  };
  collect();
}

function gsIsNoisyNow() {
  if (gsNoise.baselineDb === null || gsNoise.lastDb === null) return false;
  return gsNoise.lastDb > gsNoise.baselineDb + GS_NOISE_MARGIN_DB;
}

function gsLiveRenderNoise() {
  const note = document.getElementById("liveNoiseNote");
  if (!note) return;
  if (gsNoise.baselineDb === null) {
    note.textContent = "No quiet level recorded. Sample it so the app can flag noisy measurements.";
    return;
  }
  note.textContent = gsNoise.analyser
    ? `Quiet level recorded. Listening — measurements taken more than ${GS_NOISE_MARGIN_DB} dB above it will be flagged.`
    : "Quiet level recorded. Start the task to begin listening.";
}

/* ============================================================
 * LIVE COMPARISON — at the street
 * ============================================================ */

const gsLiveState = {
  direction: "left", // left => half street (clear the near lane), right => full street
  armed: false,
  detectedAt: 0,
  noisyAtDetect: false
};

function gsLiveStreetForDirection() {
  return gsLiveState.direction === "left" ? "half" : "full";
}

function gsLiveStatus(message, tone = "neutral") {
  const el = document.getElementById("liveStatus");
  const text = document.getElementById("liveStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  announceScreenReader(message);
}

function gsLiveUpdateButton() {
  const label = document.getElementById("liveBtnLabel");
  const hint = document.getElementById("liveBtnHint");
  const btn = document.getElementById("liveBtn");
  const cancel = document.getElementById("liveCancelBtn");
  if (!btn || !label) return;

  if (gsLiveState.armed) {
    label.textContent = "PASSED";
    if (hint) hint.textContent = "Tap the moment it reaches you";
    btn.classList.remove("idle");
    btn.classList.add("running", "stage-halfway");
    btn.setAttribute("aria-label", "Vehicle passed. Tap the moment it reaches you.");
    if (cancel) cancel.hidden = false;
    return;
  }
  label.textContent = "DETECTED";
  if (hint) hint.textContent = "Tap the moment you first hear it";
  btn.classList.remove("running", "stage-halfway");
  btn.classList.add("idle");
  btn.setAttribute("aria-label", "Vehicle detected. Tap the moment you first hear it.");
  if (cancel) cancel.hidden = true;
}

function gsLiveTap() {
  ensureAudioContext();

  if (!gsLiveState.armed) {
    const crossing = gsCrossingTimeFor(gsLiveStreetForDirection());
    if (!Number.isFinite(crossing) || crossing <= 0) {
      gsLiveStatus("Set your crossing times first.", "warn");
      return;
    }
    gsLiveState.armed = true;
    gsLiveState.detectedAt = performance.now();
    gsLiveState.noisyAtDetect = gsIsNoisyNow();
    playConfirmTone();
    hapticCue("start");
    gsLiveUpdateButton();
    gsLiveStatus(
      gsLiveState.noisyAtDetect
        ? "Timing — note: it is louder than your quiet level right now."
        : "Timing… tap again when it reaches you."
    );
    return;
  }

  const warningSec = (performance.now() - gsLiveState.detectedAt) / 1000;
  gsLiveState.armed = false;
  gsLiveUpdateButton();
  gsLiveResolve(warningSec);
}

function gsLiveCancel() {
  gsLiveState.armed = false;
  gsLiveUpdateButton();
  gsLiveStatus("Cancelled — nothing recorded. Ready for the next vehicle.");
  playConfirmTone();
}

function gsLiveResolve(warningSec) {
  const street = gsLiveStreetForDirection();
  const crossingSec = gsCrossingTimeFor(street);
  const margin = gsEffectiveMargin("live", street);
  const category = gsClassifyInterval(warningSec, crossingSec, margin);
  // "Enough time" means the warning was at least as long as the crossing.
  const enough = category === "longer";

  gsLogAttempt({
    activity: "live",
    street,
    userSec: warningSec,
    refSec: crossingSec,
    diffSec: warningSec - crossingSec,
    correct: enough,
    marginSec: margin,
    answer: category,
    expected: category,
    noisy: gsLiveState.noisyAtDetect
  });

  const verdict = {
    longer: "Longer than your crossing — that vehicle gave you enough warning.",
    same: "About the same as your crossing — too close to rely on.",
    shorter: "Shorter than your crossing — not enough warning."
  }[category];

  playFeedbackTone(enough ? "acceptable" : "outside", 0.05);
  hapticCue(enough ? "reference_ok" : "reference_bad");
  gsLiveStatus(
    gsLiveState.noisyAtDetect ? `${verdict} (Flagged: not quiet when you started.)` : verdict,
    enough ? "ok" : "warn"
  );
  gsLiveRenderTally();

  // Then let them feel the two durations side by side.
  setTimeout(() => {
    suppressSrAnnouncements = true;
    const doneAt = gsReplayComparison(warningSec, crossingSec, gsIntervalStyle());
    setTimeout(() => { suppressSrAnnouncements = false; }, (doneAt + 0.2) * 1000);
  }, 1100);
}

function gsLiveSetDirection(direction) {
  gsLiveState.direction = direction;
  const street = gsLiveStreetForDirection();
  gsLiveStatus(
    `From the ${direction}: comparing against your ${street === "half" ? "half street" : "full street"} time.`
  );
  gsLiveRenderTally();
}

function gsLiveRenderTally() {
  const el = document.getElementById("liveTally");
  if (!el) return;
  const entries = gsHistoryFor("live", gsLiveStreetForDirection(), 20);
  if (!entries.length) {
    el.textContent = "No vehicles timed yet.";
    return;
  }
  const enough = entries.filter((e) => e.correct).length;
  const noisy = entries.filter((e) => e.noisy).length;
  const noisyNote = noisy ? ` · ${noisy} flagged noisy` : "";
  el.textContent = `Last ${entries.length}: ${enough} gave enough warning${noisyNote}`;
}

/* ---------------- init ---------------- */

function gsComparisonInit() {
  gsLoadNoiseBaseline();

  document.querySelectorAll("input[name='compareStreet']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsCompareSetStreet(input.value);
    });
  });

  const startBtn = document.getElementById("compareStartBtn");
  if (startBtn) startBtn.addEventListener("click", () => gsCompareNewTrial());

  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => gsCompareAnswer(btn.dataset.answer));
  });

  const followUpBtn = document.getElementById("compareFollowUpBtn");
  if (followUpBtn) followUpBtn.addEventListener("click", gsCompareFollowUpTap);

  document.querySelectorAll("input[name='liveDirection']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsLiveSetDirection(input.value);
    });
  });

  const liveBtn = document.getElementById("liveBtn");
  if (liveBtn) liveBtn.addEventListener("click", gsLiveTap);

  const cancelBtn = document.getElementById("liveCancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", gsLiveCancel);

  const sampleBtn = document.getElementById("liveSampleNoiseBtn");
  if (sampleBtn) sampleBtn.addEventListener("click", gsNoiseSampleBaseline);

  gsCompareSetAnswersEnabled(false);
  gsCompareRenderScore();
  gsLiveUpdateButton();
  gsLiveRenderTally();
  gsLiveRenderNoise();
}
