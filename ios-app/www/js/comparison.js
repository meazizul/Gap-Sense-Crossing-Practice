/* ============================================================
 * Gap Sense — Comparison tasks
 * ============================================================
 *
 * Knowing your own crossing time is the prerequisite skill. The skill it is a
 * prerequisite *for* is this one: judging whether the WARNING TIME of an
 * approaching vehicle — from first hearing or seeing it until it passes in
 * front of you — is longer or shorter than the time you need to cross.
 *
 * Vocabulary (Cindi, 7 Oct 2026): the sound the app plays is a "sample warning
 * time". It is not a gap. A gap is the interval between two vehicles.
 *
 * Two modes:
 *
 *   COMPARE   anywhere, no traffic. The app plays a sample warning time and
 *             the student judges it against their crossing time, then FEELS
 *             the difference in an overlapped replay (sample and real crossing
 *             time start together, exactly like the Practice replay), and can
 *             optionally tap out how much longer or shorter it was.
 *   LIVE      at a real kerb. The student taps when they detect a vehicle and
 *             again when it passes; the app measures the real warning time,
 *             gives the verdict, and replays it against the crossing time.
 *
 * Every timer belonging to a flow is tracked so that restarting, or leaving
 * the screen, cancels the flow cleanly. Nothing auto-advances: the student
 * presses to hear the next sample.
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

const GS_ANSWER_SHORT = {
  shorter: "shorter than your crossing",
  same: "about the same as your crossing",
  longer: "longer than your crossing"
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

/* Flow timers: one list per module so a cancel can clear exactly its own. */
const gsCompareTimers = [];
const gsLiveTimers = [];

function gsLater(list, fn, delaySec) {
  const id = setTimeout(fn, Math.max(0, delaySec) * 1000);
  list.push(id);
  return id;
}

function gsClearTimers(list) {
  while (list.length) clearTimeout(list.pop());
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

/* ---------------- Sample loudness ---------------- */

const GS_SAMPLE_VOLUME_KEY = "om-sample-volume";
const GS_SAMPLE_VOLUME_DEFAULT = 0.85;

function gsSampleVolume() {
  const stored = Number(localStorage.getItem(GS_SAMPLE_VOLUME_KEY));
  if (!Number.isFinite(stored) || stored < 0.2 || stored > 1) return GS_SAMPLE_VOLUME_DEFAULT;
  return stored;
}

function gsSetSampleVolume(value) {
  const clamped = Math.min(1, Math.max(0.2, Number(value) || GS_SAMPLE_VOLUME_DEFAULT));
  localStorage.setItem(GS_SAMPLE_VOLUME_KEY, String(clamped));
  return clamped;
}

/* ---------------- Sample playback ---------------- */

const GS_SAMPLE_PARTIALS = [{ freq: 392, gain: 0.34 }, { freq: 466, gain: 0.22 }];

/**
 * Play a sample warning time. "continuous" is one tone that grows from quiet
 * to loud over the whole interval and then stops dead, the way a vehicle
 * approaches; "ticks" is two marker taps with silence between. Both also show
 * a held flash and give a pulse at each end.
 */
function gsPlaySample(intervalSec, startDelaySec = 0, style = "continuous", options = {}) {
  ensureAudioContext();
  const volume = gsSampleVolume() * (options.volumeScale ?? 1);
  if (style === "ticks") {
    playUserMarkerTone(startDelaySec);
    playUserMarkerTone(startDelaySec + intervalSec);
  } else {
    playCompositeTone(GS_SAMPLE_PARTIALS, intervalSec, startDelaySec, volume, "rising");
  }
  if (options.visual !== false && typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(startDelaySec, intervalSec);
  }
  if (options.haptic !== false) gsFeelInterval(startDelaySec, intervalSec);
}

/**
 * OVERLAPPED REPLAY — the sample (or a measured warning time, or the student's
 * own tapped-out estimate) and the real crossing time start together. The
 * student hears a marker at the start, the sample for its length, a marker
 * where the sample ended, and the feedback cue where the real crossing time
 * ends: a chime if the two were within the margin, the low pulse if not. The
 * order of the last two sounds is the direction; the distance between them is
 * the magnitude. This is the same vocabulary as the Practice replay, which is
 * what Cindi asked for ("same sounds and symbols as in original time
 * learning – determine magnitude and direction of difference. FEEL it.").
 *
 * The old replay played the two durations back to back and marked the real
 * crossing with the "acceptable" chime at both ends, so a wrong answer ended
 * with two "you were close" sounds. That is gone.
 *
 * Returns the time (seconds from now) at which the replay is over.
 */
function gsReplayOverlapped({ sampleSec, crossingSec, style = "continuous", marginSec, startDelaySec = 0.6, timers }) {
  ensureAudioContext();
  const t0 = startDelaySec;
  const within = Math.abs(sampleSec - crossingSec) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";

  // The sample: markers at both ends, with the rising tone between them when
  // the continuous style is on. Quieter than the live sample so the cues
  // stand out above it.
  playUserMarkerTone(t0);
  if (style !== "ticks") {
    playCompositeTone(GS_SAMPLE_PARTIALS, sampleSec, t0, gsSampleVolume() * 0.55, "rising");
  }
  playUserMarkerTone(t0 + sampleSec);

  // The real crossing time ends here.
  playFeedbackTone(feedbackType, t0 + crossingSec);

  // Touch: the sample's two ends, then the verdict pulse at the crossing time.
  gsHapticAt(t0, "marker");
  gsHapticAt(t0 + sampleSec, "marker");
  gsHapticAt(t0 + crossingSec, within ? "reference_ok" : "reference_bad");

  // Sight: the practice overlay. A held flash for the sample, then the
  // acceptable/outside shape at the crossing time.
  if (typeof startSynchronizedVisualReplay === "function") {
    const events = [
      { timeSec: t0, type: "user", holdSec: Math.max(0.2, sampleSec) },
      { timeSec: t0 + sampleSec, type: "user" },
      { timeSec: t0 + crossingSec, type: "reference", feedbackType }
    ];
    const endAt = t0 + Math.max(sampleSec, crossingSec) + 0.6;
    startSynchronizedVisualReplay(events, endAt);
  }

  return t0 + Math.max(sampleSec, crossingSec) + 0.9;
}

function gsIntervalStyle() {
  const checked = document.querySelector("input[name='gsIntervalStyle']:checked");
  return checked ? checked.value : "continuous";
}

/* ============================================================
 * COMPARE PRACTICE
 * ============================================================ */

const gsCompareState = {
  street: "full",
  intervalSec: 0,
  crossingSec: 0,
  marginSec: 0.4,
  expected: "same",
  phase: "idle", // idle | waiting | playing | answering | judged | howmuch | replaying
  howMuchStart: 0
};

function gsCompareMargin() {
  return gsEffectiveMargin("compare", gsCompareState.street);
}

/**
 * Build a trial. Categories are drawn evenly so the student cannot learn a
 * base rate, and the magnitude is scaled to the crossing time so the task
 * stays proportionally as hard on a wide street as a narrow one. The interval
 * is then re-checked against the margin so the stored category is always the
 * one the student will be judged against.
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

  interval = Math.max(0.5, interval);
  return { interval, category: gsClassifyInterval(interval, crossingSec, marginSec) };
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
  const pad = document.getElementById("compareSwipePad");
  if (pad) pad.hidden = !enabled;
}

function gsCompareSetStartEnabled(enabled, label = "Play a sample warning time") {
  const btn = document.getElementById("compareStartBtn");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.textContent = label;
}

function gsCompareRandomDelayEnabled() {
  return Boolean(document.getElementById("compareRandomDelay")?.checked);
}

function gsCompareHowMuchEnabled() {
  return Boolean(document.getElementById("compareFollowUp")?.checked);
}

/** Cancel whatever the compare flow is doing. Safe to call at any time. */
function gsCompareCancel() {
  gsClearTimers(gsCompareTimers);
  gsClearHaptics();
  suppressSrAnnouncements = false;
  gsCompareState.phase = "idle";
  gsCompareState.howMuchStart = 0;
  gsCompareSetAnswersEnabled(false);
  gsCompareSetStartEnabled(true);
  const wrap = document.getElementById("compareFollowUpWrap");
  if (wrap) wrap.hidden = true;
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsCompareBegin() {
  gsCompareCancel();
  const crossingSec = gsCrossingTimeFor(gsCompareState.street);
  if (!Number.isFinite(crossingSec) || crossingSec <= 0) {
    gsCompareStatus("Enter your crossing times in Settings first, or open the link your instructor sent.", "warn");
    return;
  }

  const margin = gsCompareMargin();
  const trial = gsBuildTrial(crossingSec, margin);
  gsCompareState.intervalSec = trial.interval;
  gsCompareState.crossingSec = crossingSec;
  gsCompareState.marginSec = margin;
  gsCompareState.expected = trial.category;
  gsCompareState.phase = "waiting";

  gsCompareSetStartEnabled(false, "Listen…");
  // Announced before speech is suppressed, so a screen-reader user hears it.
  gsCompareStatus(
    gsCompareRandomDelayEnabled()
      ? "Get ready. The sample warning time will start after a short pause."
      : "Listen to the sample warning time."
  );

  const delaySec = gsCompareRandomDelayEnabled() ? 1.2 + Math.random() * 3 : 0.35;
  gsLater(gsCompareTimers, () => {
    gsCompareState.phase = "playing";
    suppressSrAnnouncements = true;
    gsPlaySample(trial.interval, 0.05, gsIntervalStyle());
    gsLater(gsCompareTimers, () => {
      suppressSrAnnouncements = false;
      gsCompareState.phase = "answering";
      gsCompareSetAnswersEnabled(true);
      gsCompareStatus("Was that longer, shorter, or about the same as your crossing? Swipe up for longer, down for shorter, tap for about the same.");
      // Bring the answer pad into view for touch users, and land screen-reader
      // focus on the middle answer: one swipe either way reaches the other
      // two, so the answer takes at most two gestures.
      document.getElementById("compareSwipePad")?.scrollIntoView({ block: "center", behavior: "auto" });
      document.querySelector(".answer-btn[data-answer='same']")?.focus({ preventScroll: true });
    }, 0.05 + trial.interval + 0.4);
  }, delaySec);
}

function gsCompareAnswer(answer) {
  if (gsCompareState.phase !== "answering") return;
  if (!GS_ANSWERS.includes(answer)) return;
  gsCompareState.phase = "judged";
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
    marginSec: gsCompareState.marginSec,
    answer,
    expected: gsCompareState.expected
  });
  gsCompareRenderScore();

  playFeedbackTone(correct ? "acceptable" : "outside", 0.05);
  hapticCue(correct ? "reference_ok" : "reference_bad");
  const truth = GS_ANSWER_SHORT[gsCompareState.expected];
  gsCompareStatus(
    correct ? `Correct. It was ${truth}. Now feel it.` : `It was ${truth}. Feel the difference.`,
    correct ? "ok" : "warn"
  );

  const trueDiff = Math.abs(diff);
  if (gsCompareHowMuchEnabled() && trueDiff >= 0.2) {
    gsLater(gsCompareTimers, gsCompareStartHowMuch, 1.0);
  } else {
    gsLater(gsCompareTimers, () => gsCompareReplay(), 1.0);
  }
}

/** The overlapped replay of this trial, then back to idle. */
function gsCompareReplay(afterSec = 0.1) {
  gsCompareState.phase = "replaying";
  suppressSrAnnouncements = true;
  const doneAt = gsReplayOverlapped({
    sampleSec: gsCompareState.intervalSec,
    crossingSec: gsCompareState.crossingSec,
    style: gsIntervalStyle(),
    marginSec: gsCompareState.marginSec,
    startDelaySec: afterSec + 0.4
  });
  gsLater(gsCompareTimers, () => {
    suppressSrAnnouncements = false;
    gsCompareState.phase = "idle";
    gsCompareSetStartEnabled(true);
    gsCompareStatus("First the sample, then where your crossing time ends. Press Play for another.");
    document.getElementById("compareStartBtn")?.focus({ preventScroll: true });
  }, doneAt + 0.2);
}

/* Optional: "how much longer or shorter was it?" The student holds the
 * difference in mind and taps it out — the same felt-duration skill applied to
 * a difference rather than a crossing. It runs BEFORE the replay, as Cindi
 * specified, so the replay then confirms both the comparison and the estimate. */
function gsCompareStartHowMuch() {
  gsCompareState.phase = "howmuch";
  gsCompareState.howMuchStart = 0;
  const btn = document.getElementById("compareFollowUpBtn");
  const wrap = document.getElementById("compareFollowUpWrap");
  if (wrap) wrap.hidden = false;
  if (btn) {
    btn.textContent = "TAP TO START";
    btn.focus({ preventScroll: true });
  }
  const direction = gsCompareState.expected === "same"
    ? "different"
    : gsCompareState.expected;
  gsCompareStatus(`Now tap out how much ${direction} it was: tap to start, tap again to end.`);
}

function gsCompareHowMuchTap() {
  if (gsCompareState.phase !== "howmuch") return;
  const btn = document.getElementById("compareFollowUpBtn");

  if (!gsCompareState.howMuchStart) {
    gsCompareState.howMuchStart = performance.now();
    playConfirmTone();
    hapticCue("start");
    if (btn) btn.textContent = "TAP TO END";
    return;
  }

  const produced = (performance.now() - gsCompareState.howMuchStart) / 1000;
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  const margin = gsCompareState.marginSec;
  const correct = Math.abs(produced - trueDiff) <= margin;

  playConfirmTone();
  gsCompareState.howMuchStart = 0;
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
  gsCompareRenderScore();

  // 1. The comparison replay, as always.
  gsCompareState.phase = "replaying";
  gsCompareStatus("First the sample against your crossing time, then your estimate against the real difference.");
  suppressSrAnnouncements = true;
  const firstDone = gsReplayOverlapped({
    sampleSec: gsCompareState.intervalSec,
    crossingSec: gsCompareState.crossingSec,
    style: gsIntervalStyle(),
    marginSec: margin,
    startDelaySec: 0.8
  });
  // 2. Then the estimate: what they tapped out against the true difference.
  const secondDone = gsReplayOverlapped({
    sampleSec: produced,
    crossingSec: trueDiff,
    style: "ticks",
    marginSec: margin,
    startDelaySec: firstDone + 0.5
  });
  gsLater(gsCompareTimers, () => {
    suppressSrAnnouncements = false;
    gsCompareState.phase = "idle";
    gsCompareSetStartEnabled(true);
    gsCompareStatus(
      correct ? "Your estimate was close. Press Play for another." : "Your estimate was off. Press Play for another.",
      correct ? "ok" : "warn"
    );
    document.getElementById("compareStartBtn")?.focus({ preventScroll: true });
  }, secondDone + 0.2);
}

function gsCompareRenderScore() {
  const el = document.getElementById("compareScore");
  if (!el) return;
  const recentWindow = gsHistoryFor("compare", gsCompareState.street, 10)
    .filter((entry) => entry.answer !== "magnitude");
  const accuracy = gsAccuracy(recentWindow);
  const margin = gsCompareMargin();
  const marginNote = gsAdaptiveEnabled()
    ? ` · margin ${margin.toFixed(2)}s (adaptive)`
    : ` · margin ${margin.toFixed(2)}s`;
  el.textContent = accuracy === null
    ? `No attempts yet${marginNote}`
    : `Last ${recentWindow.length}: ${Math.round(accuracy * 100)}% correct${marginNote}`;
}

function gsCompareSetStreet(street) {
  gsCompareCancel();
  gsCompareState.street = street;
  gsCompareRenderScore();
  gsCompareStatus(`${street === "half" ? "First half of the street" : "Full street"} selected. Press Play when ready.`);
}

/* ---------------- Swipe answers ----------------
 * For touch users without a screen reader: swipe up on the pad for longer,
 * down for shorter, tap for about the same. Under VoiceOver or TalkBack the
 * swipes belong to the screen reader, so the three buttons remain, and focus
 * is placed on the middle one when answers open. */

const gsSwipe = { active: false, x: 0, y: 0, handled: false };
const GS_SWIPE_MIN_PX = 36;

function gsSwipeAnswerFrom(dx, dy) {
  if (Math.abs(dy) >= GS_SWIPE_MIN_PX && Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? "longer" : "shorter";
  }
  if (Math.abs(dx) < GS_SWIPE_MIN_PX && Math.abs(dy) < GS_SWIPE_MIN_PX) return "same";
  return null;
}

function gsBindSwipePad(pad) {
  pad.addEventListener("pointerdown", (event) => {
    gsSwipe.active = true;
    gsSwipe.handled = false;
    gsSwipe.x = event.clientX;
    gsSwipe.y = event.clientY;
    try { pad.setPointerCapture(event.pointerId); } catch (error) { /* optional */ }
  });
  pad.addEventListener("pointerup", (event) => {
    if (!gsSwipe.active) return;
    gsSwipe.active = false;
    const answer = gsSwipeAnswerFrom(event.clientX - gsSwipe.x, event.clientY - gsSwipe.y);
    if (!answer) return;
    gsSwipe.handled = true;
    gsCompareAnswer(answer);
  });
  pad.addEventListener("pointercancel", () => { gsSwipe.active = false; });
  // A plain click (keyboard Enter/Space, VoiceOver double-tap) means "same",
  // unless a pointer swipe already answered.
  pad.addEventListener("click", () => {
    if (gsSwipe.handled) { gsSwipe.handled = false; return; }
    gsCompareAnswer("same");
  });
  pad.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") { event.preventDefault(); gsCompareAnswer("longer"); }
    if (event.key === "ArrowDown") { event.preventDefault(); gsCompareAnswer("shorter"); }
  });
}

/* ============================================================
 * AMBIENT NOISE (experimental, opt-in)
 * ------------------------------------------------------------
 * How quiet it is, is the single biggest factor in how early a vehicle can be
 * heard. The idea: sample the quiet first, then flag any trial started while
 * it is noticeably louder than that baseline. Cindi doubts it survives real
 * phones, pockets and hands, so it is off unless the student switches it on,
 * and the microphone is only ever opened while that switch is on and the
 * "At the street" screen is showing.
 * ============================================================ */

const GS_NOISE_KEY = "om-noise-baseline";
const GS_NOISE_ENABLED_KEY = "om-live-noise";
const GS_NOISE_MARGIN_DB = 6; // how far above baseline counts as "not quiet"

const gsNoise = {
  stream: null,
  analyser: null,
  data: null,
  baselineDb: null,
  lastDb: null,
  rafId: null,
  session: 0,      // bumped on every stop; a late getUserMedia result is discarded
  wanted: false    // true only while the Live screen is showing and the switch is on
};

function gsNoiseEnabled() {
  return localStorage.getItem(GS_NOISE_ENABLED_KEY) === "true";
}

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
  const session = gsNoise.session;
  gsNoise.wanted = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // The student may have left the screen while the permission prompt was
    // up. If so, release the microphone at once instead of leaving it open.
    if (!gsNoise.wanted || session !== gsNoise.session) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
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
  gsNoise.wanted = false;
  gsNoise.session += 1;
  if (gsNoise.rafId !== null) cancelAnimationFrame(gsNoise.rafId);
  gsNoise.rafId = null;
  gsNoise.stream?.getTracks().forEach((track) => track.stop());
  gsNoise.stream = null;
  gsNoise.analyser = null;
  gsNoise.data = null;
  gsNoise.lastDb = null;
}

function gsNoiseActive() {
  return Boolean(gsNoise.analyser);
}

async function gsNoiseSampleBaseline() {
  if (!gsNoiseEnabled()) return;
  const ok = await gsNoiseStart();
  const note = document.getElementById("liveNoiseNote");
  if (!ok) {
    if (note) note.textContent = "Microphone unavailable — noise checking is off.";
    return;
  }
  if (note) note.textContent = "Sampling the quiet… stay still for 3 seconds.";
  announceScreenReader("Sampling the quiet. Stay still for three seconds.");
  const samples = [];
  const started = Date.now();
  const session = gsNoise.session;
  const collect = () => {
    if (session !== gsNoise.session) return; // stopped meanwhile
    const db = gsCurrentDb();
    if (db !== null) samples.push(db);
    if (Date.now() - started < 3000) {
      gsLater(gsLiveTimers, collect, 0.1);
      return;
    }
    if (!samples.length) return;
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
  if (!gsNoiseEnabled()) return false;
  if (gsNoise.baselineDb === null || gsNoise.lastDb === null) return false;
  return gsNoise.lastDb > gsNoise.baselineDb + GS_NOISE_MARGIN_DB;
}

function gsLiveRenderNoise() {
  const note = document.getElementById("liveNoiseNote");
  const sampleBtn = document.getElementById("liveSampleNoiseBtn");
  const toggle = document.getElementById("liveNoiseEnabled");
  const enabled = gsNoiseEnabled();
  if (toggle) toggle.checked = enabled;
  if (sampleBtn) sampleBtn.disabled = !enabled;
  if (!note) return;
  if (!enabled) {
    note.textContent = "Off. The microphone stays closed.";
    return;
  }
  if (gsNoise.baselineDb === null) {
    note.textContent = "On. Sample the quiet so the app can flag measurements taken when it is louder.";
    return;
  }
  note.textContent = gsNoiseActive()
    ? `Quiet level recorded. Listening — measurements started more than ${GS_NOISE_MARGIN_DB} dB above it are flagged.`
    : "Quiet level recorded.";
}

/* Called by the shell when the Live screen is entered or left. */
function gsLiveEnter() {
  if (gsNoiseEnabled()) gsNoiseStart().then(() => gsLiveRenderNoise());
  gsLiveRenderNoise();
}

function gsLiveLeave() {
  gsNoiseStop();
}

/* ============================================================
 * LIVE COMPARISON — at the street
 * ============================================================ */

const gsLiveState = {
  direction: "left", // left => first half of the street; right => full street
  armed: false,
  detectedAt: 0,
  noisyAtDetect: false,
  replaying: false
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
    btn.setAttribute("aria-label", "Passed. Tap the moment the vehicle reaches you.");
    if (cancel) cancel.hidden = false;
    return;
  }
  label.textContent = "DETECTED";
  if (hint) hint.textContent = "Tap the moment you first hear it";
  btn.classList.remove("running", "stage-halfway");
  btn.classList.add("idle");
  btn.setAttribute("aria-label", "Detected. Tap the moment you first hear a vehicle.");
  if (cancel) cancel.hidden = true;
}

/** Cancel the live flow. Safe to call at any time. */
function gsLiveCancelFlow() {
  gsClearTimers(gsLiveTimers);
  gsClearHaptics();
  suppressSrAnnouncements = false;
  gsLiveState.armed = false;
  gsLiveState.replaying = false;
  gsLiveUpdateButton();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsLiveTap() {
  ensureAudioContext();
  if (gsLiveState.replaying) return;

  if (!gsLiveState.armed) {
    const crossing = gsCrossingTimeFor(gsLiveStreetForDirection());
    if (!Number.isFinite(crossing) || crossing <= 0) {
      gsLiveStatus("Enter your crossing times in Settings first.", "warn");
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
        ? "Timing. Note: it is louder than your quiet level right now."
        : "Timing. Tap again when it reaches you."
    );
    return;
  }

  const warningSec = (performance.now() - gsLiveState.detectedAt) / 1000;
  gsLiveState.armed = false;
  gsLiveUpdateButton();
  gsLiveResolve(warningSec);
}

function gsLiveCancel() {
  gsLiveCancelFlow();
  gsLiveStatus("Cancelled. Nothing recorded. Ready for the next vehicle.");
  playConfirmTone();
}

function gsLiveResolve(warningSec) {
  const street = gsLiveStreetForDirection();
  const crossingSec = gsCrossingTimeFor(street);
  const margin = gsEffectiveMargin("live", street);
  const category = gsClassifyInterval(warningSec, crossingSec, margin);
  // "Enough time" means the warning was clearly longer than the crossing.
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
    longer: "Longer than your crossing. That vehicle gave you enough warning.",
    same: "About the same as your crossing. Too close to rely on.",
    shorter: "Shorter than your crossing. Not enough warning."
  }[category];

  playFeedbackTone(enough ? "acceptable" : "outside", 0.05);
  hapticCue(enough ? "reference_ok" : "reference_bad");
  gsLiveStatus(
    gsLiveState.noisyAtDetect ? `${verdict} Flagged: it was not quiet when you started.` : verdict,
    enough ? "ok" : "warn"
  );
  gsLiveRenderTally();

  // Then let them feel the two durations together. Speech is suppressed only
  // once the verdict has been spoken.
  gsLiveState.replaying = true;
  gsLater(gsLiveTimers, () => {
    suppressSrAnnouncements = true;
    const doneAt = gsReplayOverlapped({
      sampleSec: warningSec,
      crossingSec,
      style: "ticks",
      marginSec: margin,
      startDelaySec: 0.3
    });
    gsLater(gsLiveTimers, () => {
      suppressSrAnnouncements = false;
      gsLiveState.replaying = false;
      gsLiveStatus("Ready for the next vehicle.");
    }, doneAt + 0.2);
  }, 2.4);
}

function gsLiveSetDirection(direction) {
  gsLiveCancelFlow();
  gsLiveState.direction = direction;
  const street = gsLiveStreetForDirection();
  gsLiveStatus(
    `Approaching from the ${direction}: comparing against your ${street === "half" ? "first-half" : "full-street"} time.`
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
  const noisyNote = noisy ? ` · ${noisy} flagged not quiet` : "";
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

  document.querySelectorAll("input[name='gsIntervalStyle']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) localStorage.setItem("om-sample-style", input.value);
    });
    const storedStyle = localStorage.getItem("om-sample-style");
    if (storedStyle && input.value === storedStyle) input.checked = true;
  });

  const startBtn = document.getElementById("compareStartBtn");
  if (startBtn) startBtn.addEventListener("click", () => gsCompareBegin());

  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => gsCompareAnswer(btn.dataset.answer));
  });

  const pad = document.getElementById("compareSwipePad");
  if (pad) gsBindSwipePad(pad);

  const followUpBtn = document.getElementById("compareFollowUpBtn");
  if (followUpBtn) followUpBtn.addEventListener("click", gsCompareHowMuchTap);

  ["compareFollowUp", "compareRandomDelay"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    const key = `om-${id}`;
    box.checked = localStorage.getItem(key) === "true";
    box.addEventListener("change", () => localStorage.setItem(key, String(box.checked)));
  });

  const volume = document.getElementById("sampleVolume");
  const volumeOut = document.getElementById("sampleVolumeOut");
  if (volume) {
    volume.value = String(Math.round(gsSampleVolume() * 100));
    if (volumeOut) volumeOut.textContent = `${volume.value}%`;
    volume.addEventListener("input", () => {
      if (volumeOut) volumeOut.textContent = `${volume.value}%`;
    });
    volume.addEventListener("change", () => {
      gsSetSampleVolume(Number(volume.value) / 100);
      announceScreenReader(`Sample loudness ${volume.value} percent.`);
    });
  }
  const previewSample = document.getElementById("previewSampleBtn");
  if (previewSample) {
    previewSample.addEventListener("click", () => {
      if (volume) gsSetSampleVolume(Number(volume.value) / 100);
      gsClearHaptics();
      gsPlaySample(2.0, 0.05, gsIntervalStyle(), { visual: false });
    });
  }

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

  const noiseToggle = document.getElementById("liveNoiseEnabled");
  if (noiseToggle) {
    noiseToggle.addEventListener("change", () => {
      localStorage.setItem(GS_NOISE_ENABLED_KEY, String(noiseToggle.checked));
      if (noiseToggle.checked) {
        gsNoiseStart().then(() => gsLiveRenderNoise());
      } else {
        gsNoiseStop();
      }
      gsLiveRenderNoise();
    });
  }

  gsCompareSetAnswersEnabled(false);
  gsCompareSetStartEnabled(true);
  gsCompareRenderScore();
  gsLiveUpdateButton();
  gsLiveRenderTally();
  gsLiveRenderNoise();
}
