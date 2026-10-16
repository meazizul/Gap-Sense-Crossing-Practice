/* ============================================================
 * Gap Sense — Comparison tasks
 * ============================================================
 *
 * Knowing your own crossing time is the prerequisite skill. The skill it is a
 * prerequisite *for* is this one: judging whether the WARNING TIME of an
 * approaching vehicle (from first detecting it until it passes in front of
 * you) is longer, shorter, or about the same as the time you need to cross.
 *
 * Vocabulary (Cindi): the sound the app plays is a "sample
 * warning time". It is not a gap. A gap is the interval between two vehicles.
 *
 *   COMPARISON PRACTICE  anywhere, no traffic. The app plays a sample warning
 *                        time; the student judges it on a full-screen pad,
 *                        hears/feels/sees whether they were right, can tap
 *                        out how much longer or shorter (only after a correct
 *                        longer/shorter answer), then feels it in a replay.
 *   AT THE STREET        a real vehicle. The student swipes toward the side
 *                        it comes from when they think they detect it, taps
 *                        when it passes in front of them, then makes the same
 *                        judgment. The app never gives the answer first.
 *
 * Sounds and what they mean (build 7):
 *   the sample            one steady sound, one loudness, no fade
 *   "this is your time"   the student's own marker sound and flash
 *   right / wrong         the within-margin chime / outside-margin pulse,
 *                         with the circle / triangle when visual is on
 *
 * Every timer belonging to a flow is tracked so that restarting, or leaving
 * the screen, cancels the flow cleanly. Nothing auto-advances.
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
 * Mark moments by touch. For a DeafBlind traveler this is the whole channel:
 * the only thing carrying a duration is the time between two pulses.
 */
const gsHapticTimers = [];

function gsHapticAt(delaySec, cue) {
  gsHapticTimers.push(setTimeout(() => hapticCue(cue), Math.max(0, delaySec) * 1000));
}

function gsClearHaptics() {
  while (gsHapticTimers.length) clearTimeout(gsHapticTimers.pop());
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

/**
 * Run fn once self-voicing has finished speaking, so a spoken direction never
 * lands on top of a sample. Without self-voicing it runs at once.
 */
function gsAfterSpeech(list, fn, maxSec = 5) {
  const speaking = () => a11ySettings.selfVoice && typeof speechAvailable === "function" &&
    speechAvailable() && window.speechSynthesis.speaking;
  if (!speaking()) {
    fn();
    return;
  }
  let waited = 0;
  const poll = () => {
    waited += 0.1;
    if (!speaking() || waited >= maxSec) {
      fn();
      return;
    }
    gsLater(list, poll, 0.1);
  };
  gsLater(list, poll, 0.1);
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

/* ---------------- Sample loudness and pitch ----------------
 * Cindi: the sample must be steady and "able to be set at a high volume",
 * with a lower pitch available for students who hear low sounds better. */

const GS_SAMPLE_VOLUME_KEY = "om-sample-volume";
const GS_SAMPLE_VOLUME_DEFAULT = 1;
const GS_SAMPLE_PITCH_KEY = "om-sample-pitch";
const GS_SAMPLE_PITCHES = [
  { hz: 165, label: "Lowest" },
  { hz: 220, label: "Low" },
  { hz: 294, label: "Medium low" },
  { hz: 392, label: "Medium" },
  { hz: 523, label: "High" }
];
const GS_SAMPLE_PITCH_DEFAULT = 3;

function gsSampleVolume() {
  const stored = Number(localStorage.getItem(GS_SAMPLE_VOLUME_KEY));
  if (!Number.isFinite(stored) || stored < 0.2 || stored > 1 || localStorage.getItem(GS_SAMPLE_VOLUME_KEY) === null) {
    return GS_SAMPLE_VOLUME_DEFAULT;
  }
  return stored;
}

function gsSetSampleVolume(value) {
  const clamped = Math.min(1, Math.max(0.2, Number(value) || GS_SAMPLE_VOLUME_DEFAULT));
  localStorage.setItem(GS_SAMPLE_VOLUME_KEY, String(clamped));
  return clamped;
}

function gsSamplePitchIndex() {
  const stored = localStorage.getItem(GS_SAMPLE_PITCH_KEY);
  const index = stored === null ? GS_SAMPLE_PITCH_DEFAULT : Number(stored);
  return Number.isInteger(index) && index >= 0 && index < GS_SAMPLE_PITCHES.length ? index : GS_SAMPLE_PITCH_DEFAULT;
}

function gsSetSamplePitchIndex(index) {
  const clean = Math.min(GS_SAMPLE_PITCHES.length - 1, Math.max(0, Math.round(Number(index) || 0)));
  localStorage.setItem(GS_SAMPLE_PITCH_KEY, String(clean));
  return clean;
}

/* Two sine partials a minor third apart: a fuller sound than one sine, which
 * carries better on phone speakers. Low pitches get a little more of the
 * upper partial, which small speakers reproduce better. */
function gsSamplePartials() {
  const base = GS_SAMPLE_PITCHES[gsSamplePitchIndex()].hz;
  const upper = base < 250 ? 0.3 : 0.22;
  return [{ freq: base, gain: 0.4 }, { freq: base * 1.189, gain: upper }];
}

function gsSampleLevel() {
  return gsSampleVolume();
}

/** One short burst of the sample sound: the "beeps" style marks an interval with two of these. */
function gsPlaySampleBeep(atSec) {
  playCompositeTone(gsSamplePartials(), 0.12, atSec, gsSampleLevel(), "steady");
}

/* ---------------- Sample playback ---------------- */

/**
 * Play a sample warning time. "continuous" is one steady sound for the whole
 * interval; "ticks" is two short beeps of the same sound with silence
 * between. Both also show a held bar and give a pulse at each end.
 */
function gsPlaySample(intervalSec, startDelaySec = 0, style = "continuous", options = {}) {
  ensureAudioContext();
  if (style === "ticks") {
    gsPlaySampleBeep(startDelaySec);
    gsPlaySampleBeep(startDelaySec + intervalSec);
  } else {
    playCompositeTone(gsSamplePartials(), intervalSec, startDelaySec, gsSampleLevel(), "steady");
  }
  if (options.visual !== false && typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(startDelaySec, intervalSec, "sample");
  }
  if (options.haptic !== false) {
    gsHapticAt(startDelaySec, "start");
    gsHapticAt(startDelaySec + intervalSec, "start");
  }
}

/**
 * Right or wrong, right now, on every channel: the chime or the low pulse,
 * the three knocks or the long buzz, and (when visual is on) the circle or
 * the triangle on screen. Cindi: with visual on, the brief sound before the
 * replay was the only way to know.
 */
function gsShowResult(correct) {
  playFeedbackTone(correct ? "acceptable" : "outside", 0.05);
  hapticCue(correct ? "reference_ok" : "reference_bad");
  if (typeof gsShowIntervalVisual === "function") {
    gsShowIntervalVisual(0.05, 0.75, correct ? "acceptable" : "outside");
  }
}

/* ---------------- Replays ---------------- */

/**
 * PRODUCTION replay (Comparison preparation): the student produced an
 * interval by stopping a sound. Same vocabulary as Practice my timing: the
 * sample sound for as long as they let it run, their own marker where they
 * stopped it, and the right/wrong cue where their real crossing time ends.
 * Returns the time (seconds from now) at which the replay is over.
 */
function gsReplayProduction({ producedSec, crossingSec, style = "continuous", marginSec, startDelaySec = 0.6 }) {
  ensureAudioContext();
  const t0 = startDelaySec;
  const within = Math.abs(producedSec - crossingSec) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";

  if (style === "beep" || style === "ticks") {
    gsPlaySampleBeep(t0);
  } else {
    playCompositeTone(gsSamplePartials(), producedSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playUserMarkerTone(t0 + producedSec);
  playFeedbackTone(feedbackType, t0 + crossingSec);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + producedSec, "marker");
  gsHapticAt(t0 + crossingSec, within ? "reference_ok" : "reference_bad");

  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: style === "continuous" ? Math.max(0.2, producedSec) : 0.2 },
      { timeSec: t0 + producedSec, type: "user" },
      { timeSec: t0 + crossingSec, type: "reference", feedbackType }
    ], t0 + Math.max(producedSec, crossingSec) + 0.6);
  }
  return t0 + Math.max(producedSec, crossingSec) + 0.9;
}

/**
 * JUDGMENT replay (longer / shorter / about the same): the sample warning
 * time and the student's crossing time start together. The sample plays for
 * its length; the student's own "this is your time" sound and flash land
 * where their crossing time ends. Not a right/wrong cue: the answer has
 * already been given, and Cindi found a "wrong" pulse inside the replay of a
 * correct answer confusing.
 */
function gsReplayJudgment({ sampleSec, crossingSec, style = "continuous", startDelaySec = 0.6 }) {
  ensureAudioContext();
  const t0 = startDelaySec;
  if (style === "ticks") {
    gsPlaySampleBeep(t0);
    gsPlaySampleBeep(t0 + sampleSec);
  } else {
    playCompositeTone(gsSamplePartials(), sampleSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playUserMarkerTone(t0 + crossingSec);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + sampleSec, "start");
  gsHapticAt(t0 + crossingSec, "marker");

  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: Math.max(0.2, sampleSec) },
      { timeSec: t0 + crossingSec, type: "user" }
    ], t0 + Math.max(sampleSec, crossingSec) + 0.6);
  }
  return t0 + Math.max(sampleSec, crossingSec) + 0.9;
}

/**
 * MAGNITUDE replay, option (a) — Cindi's design. One replay:
 *   - the steady sound for the student's crossing time,
 *   - the right/wrong cue (and circle/triangle) where the sample warning time
 *     ended: right if the estimate was within the margin of the true
 *     difference, wrong if not,
 *   - the student's own sound (and flash) at the crossing time plus their
 *     estimate (for "longer") or minus it (for "shorter").
 * Her example: crossing 6 s, sample 8 s, estimate 3.5 s → sound 0–6 s, wrong
 * cue at 8 s, student's sound at 9.5 s.
 */
function gsReplayMagnitudeA({ crossingSec, sampleSec, estimateSec, direction, marginSec, style = "continuous", startDelaySec = 0.6 }) {
  ensureAudioContext();
  const t0 = startDelaySec;
  const trueDiff = Math.abs(sampleSec - crossingSec);
  const within = Math.abs(estimateSec - trueDiff) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";
  const estimateAt = Math.max(0, direction === "shorter" ? crossingSec - estimateSec : crossingSec + estimateSec);

  if (style === "ticks") {
    gsPlaySampleBeep(t0);
    gsPlaySampleBeep(t0 + crossingSec);
  } else {
    playCompositeTone(gsSamplePartials(), crossingSec, t0, gsSampleLevel() * 0.6, "steady");
  }
  playFeedbackTone(feedbackType, t0 + sampleSec);
  playUserMarkerTone(t0 + estimateAt);

  gsHapticAt(t0, "start");
  gsHapticAt(t0 + crossingSec, "start");
  gsHapticAt(t0 + sampleSec, within ? "reference_ok" : "reference_bad");
  gsHapticAt(t0 + estimateAt, "marker");

  const end = Math.max(crossingSec, sampleSec, estimateAt);
  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "sample", holdSec: Math.max(0.2, crossingSec) },
      { timeSec: t0 + sampleSec, type: "reference", feedbackType },
      { timeSec: t0 + estimateAt, type: "user" }
    ], t0 + end + 0.6);
  }
  return t0 + end + 0.9;
}

/**
 * MAGNITUDE replay, option (b): like Practice my timing. The student's sound
 * at the start and where their tapped-out estimate ended; the right/wrong cue
 * where the true difference ends.
 */
function gsReplayMagnitudeB({ estimateSec, trueDiffSec, marginSec, startDelaySec = 0.6 }) {
  ensureAudioContext();
  const t0 = startDelaySec;
  const within = Math.abs(estimateSec - trueDiffSec) <= marginSec;
  const feedbackType = within ? "acceptable" : "outside";
  playUserMarkerTone(t0);
  playUserMarkerTone(t0 + estimateSec);
  playFeedbackTone(feedbackType, t0 + trueDiffSec);

  gsHapticAt(t0, "marker");
  gsHapticAt(t0 + estimateSec, "marker");
  gsHapticAt(t0 + trueDiffSec, within ? "reference_ok" : "reference_bad");

  const end = Math.max(estimateSec, trueDiffSec);
  if (typeof startSynchronizedVisualReplay === "function") {
    startSynchronizedVisualReplay([
      { timeSec: t0, type: "user" },
      { timeSec: t0 + estimateSec, type: "user" },
      { timeSec: t0 + trueDiffSec, type: "reference", feedbackType }
    ], t0 + end + 0.6);
  }
  return t0 + end + 0.9;
}

/* ============================================================
 * Full-screen pads
 * ------------------------------------------------------------
 * Cindi: swiping inside a box kept scrolling the page instead. Answers now
 * open a pad that covers the whole screen and does not scroll. The three
 * buttons sit on the pad too: VoiceOver and TalkBack own swipes, so screen
 * reader users answer with the buttons (focus starts on the middle one).
 * <main> is made inert while a pad is open.
 * ============================================================ */

let gsOpenPads = 0;

function gsShowPad(el) {
  if (!el || !el.hidden) return;
  el.hidden = false;
  gsOpenPads += 1;
  if (typeof setMainContentInert === "function") setMainContentInert(true);
  document.body.classList.add("pad-open");
}

function gsHidePad(el) {
  if (!el || el.hidden) return;
  el.hidden = true;
  gsOpenPads = Math.max(0, gsOpenPads - 1);
  if (!gsOpenPads) {
    document.body.classList.remove("pad-open");
    const dialogOpen = [...document.querySelectorAll("dialog")].some((d) => d.open);
    if (!dialogOpen && typeof setMainContentInert === "function") setMainContentInert(false);
  }
}

const GS_SWIPE_MIN_PX = 36;

/**
 * Read swipes and taps on a surface. handlers: { up, down, left, right, tap }.
 * Pointer events that start on a button, select or link are left alone so
 * the buttons on the pad still work normally.
 */
function gsBindSwipeSurface(surface, getHandlers) {
  const swipe = { active: false, x: 0, y: 0, id: null };
  // Controls keep their own behavior; the title is excluded so that a
  // screen-reader double tap on it can never count as an answer.
  const isControl = (target) => Boolean(target?.closest?.("button, select, a, input, label, summary, .gesture-title"));
  surface.addEventListener("pointerdown", (event) => {
    if (isControl(event.target)) return;
    swipe.active = true;
    swipe.x = event.clientX;
    swipe.y = event.clientY;
    swipe.id = event.pointerId;
    try { surface.setPointerCapture(event.pointerId); } catch (error) { /* optional */ }
  });
  surface.addEventListener("pointerup", (event) => {
    if (!swipe.active || event.pointerId !== swipe.id) return;
    swipe.active = false;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    const handlers = getHandlers() || {};
    let kind = null;
    if (Math.abs(dx) < GS_SWIPE_MIN_PX && Math.abs(dy) < GS_SWIPE_MIN_PX) kind = "tap";
    else if (Math.abs(dy) >= Math.abs(dx)) kind = dy < 0 ? "up" : "down";
    else kind = dx < 0 ? "left" : "right";
    if (typeof handlers[kind] === "function") {
      event.preventDefault();
      handlers[kind]();
    }
  });
  surface.addEventListener("pointercancel", () => { swipe.active = false; });
  // The pad never scrolls the page.
  surface.addEventListener("touchmove", (event) => { event.preventDefault(); }, { passive: false });
}

/* ---------------- Answer pad ---------------- */

const gsAnswerPad = { onAnswer: null };

function gsOpenAnswerPad({ title, onAnswer }) {
  const overlay = document.getElementById("answerOverlay");
  if (!overlay) return;
  gsAnswerPad.onAnswer = onAnswer;
  const titleEl = document.getElementById("answerOverlayTitle");
  if (titleEl) titleEl.textContent = title;
  const surface = document.getElementById("answerSurface");
  const swipeOn = gsFeature("compareSwipe") !== "off";
  if (surface) surface.hidden = !swipeOn;
  overlay.classList.toggle("buttons-only", !swipeOn);
  gsShowPad(overlay);
  // One swipe either way from the middle answer reaches the other two.
  document.querySelector("#answerOverlay .answer-btn[data-answer='same']")?.focus({ preventScroll: true });
}

function gsCloseAnswerPad() {
  gsAnswerPad.onAnswer = null;
  gsHidePad(document.getElementById("answerOverlay"));
}

function gsAnswerPadAnswer(answer) {
  const handler = gsAnswerPad.onAnswer;
  if (!handler || !GS_ANSWERS.includes(answer)) return;
  gsCloseAnswerPad();
  handler(answer);
}

/* ---------------- "How much" pad ---------------- */

const gsHowMuchPad = { start: 0, onDone: null };

function gsOpenHowMuchPad({ title, onDone }) {
  const overlay = document.getElementById("howMuchOverlay");
  const btn = document.getElementById("compareFollowUpBtn");
  if (!overlay || !btn) return;
  gsHowMuchPad.start = 0;
  gsHowMuchPad.onDone = onDone;
  const titleEl = document.getElementById("howMuchTitle");
  if (titleEl) titleEl.textContent = title;
  btn.textContent = "TAP TO START";
  btn.setAttribute("aria-label", `${title} Tap to start, then tap again to end.`);
  gsShowPad(overlay);
  btn.focus({ preventScroll: true });
}

function gsCloseHowMuchPad() {
  gsHowMuchPad.start = 0;
  gsHowMuchPad.onDone = null;
  gsHidePad(document.getElementById("howMuchOverlay"));
}

function gsHowMuchTap() {
  if (!gsHowMuchPad.onDone) return;
  const btn = document.getElementById("compareFollowUpBtn");
  if (!gsHowMuchPad.start) {
    gsHowMuchPad.start = performance.now();
    playConfirmTone();
    hapticCue("start");
    if (btn) {
      btn.textContent = "TAP TO END";
      btn.setAttribute("aria-label", "Tap to end.");
    }
    return;
  }
  const produced = (performance.now() - gsHowMuchPad.start) / 1000;
  playConfirmTone();
  const done = gsHowMuchPad.onDone;
  gsCloseHowMuchPad();
  done(produced);
}

/* ============================================================
 * COMPARISON PRACTICE
 * ============================================================ */

const gsCompareState = {
  street: "full",
  intervalSec: 0,
  crossingSec: 0,
  marginSec: 0.4,
  expected: "same",
  phase: "idle" // idle | waiting | playing | answering | judged | howmuch | replaying
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
    // Inside the margin, but rarely dead-on: that would be too easy.
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

function gsCompareStatus(message, tone = "neutral", { announce = true } = {}) {
  const el = document.getElementById("compareStatus");
  const text = document.getElementById("compareStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  if (announce) announceScreenReader(message);
}

function gsCompareSetStartEnabled(enabled, label = "Play a sample warning time") {
  const btn = document.getElementById("compareStartBtn");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.textContent = label;
}

function gsCompareStyle() {
  return gsFeatureStyle("compareSound", "gsIntervalStyle", "continuous");
}

/* Kept for older callers. */
function gsIntervalStyle() {
  return gsCompareStyle();
}

function gsCompareRandomDelayEnabled() {
  return gsFeatureActive("compareRandomPause", "compareRandomDelay");
}

function gsCompareHowMuchEnabled() {
  return gsFeatureActive("compareHowMuch", "compareFollowUp");
}

/** Cancel whatever the compare flow is doing. Safe to call at any time. */
function gsCompareCancel() {
  gsClearTimers(gsCompareTimers);
  gsClearHaptics();
  suppressSrAnnouncements = false;
  gsCompareState.phase = "idle";
  gsCloseAnswerPad();
  gsCloseHowMuchPad();
  gsCompareSetStartEnabled(true);
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsCompareBegin() {
  gsCompareCancel();
  const crossingSec = gsCrossingTimeFor(gsCompareState.street);
  if (!Number.isFinite(crossingSec) || crossingSec <= 0) {
    gsCompareStatus("Enter your crossing times in Instructor setup first, or open the link your instructor sent.", "warn");
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
  const randomPause = gsCompareRandomDelayEnabled();
  // Announced before speech is suppressed, so a screen-reader user hears it.
  gsCompareStatus(randomPause
    ? "Get ready. The sample warning time will start after a pause."
    : "Listen to the sample warning time.");

  gsAfterSpeech(gsCompareTimers, () => {
    const delaySec = randomPause ? 1.2 + Math.random() * 3 : 0.35;
    gsLater(gsCompareTimers, () => {
      gsCompareState.phase = "playing";
      gsBeginQuiet();
      gsPlaySample(trial.interval, 0.05, gsCompareStyle());
      gsLater(gsCompareTimers, gsCompareAskAnswer, 0.05 + trial.interval + 0.4);
    }, delaySec);
  });
}

function gsCompareAskAnswer() {
  suppressSrAnnouncements = false;
  gsCompareState.phase = "answering";
  const title = "Was that longer, shorter, or about the same as your crossing?";
  gsCompareStatus(title, "neutral", { announce: false });
  gsOpenAnswerPad({ title, onAnswer: gsCompareAnswer });
  announceScreenReader(gsFeature("compareSwipe") !== "off"
    ? `${title} Swipe up for longer, down for shorter, tap for about the same. Or use the buttons.`
    : title);
}

function gsCompareAnswer(answer) {
  if (gsCompareState.phase !== "answering") return;
  if (!GS_ANSWERS.includes(answer)) return;
  gsCompareState.phase = "judged";
  gsCloseAnswerPad();

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

  gsShowResult(correct);
  const truth = GS_ANSWER_SHORT[gsCompareState.expected];

  // "How much" only makes sense when the student got the direction right:
  // if they could not tell longer from shorter, they cannot judge how much.
  const offerHowMuch = correct && gsCompareState.expected !== "same" && gsCompareHowMuchEnabled();
  gsCompareStatus(
    correct ? `Correct. It was ${truth}.` : `Not quite. It was ${truth}. Feel the difference.`,
    correct ? "ok" : "warn"
  );
  gsLater(gsCompareTimers, offerHowMuch ? gsCompareStartHowMuch : () => gsCompareReplay(), 1.2);
}

/** The judgment replay of this trial, then back to idle. */
function gsCompareReplay(afterSec = 0.1) {
  gsCompareState.phase = "replaying";
  gsBeginQuiet();
  const doneAt = gsReplayJudgment({
    sampleSec: gsCompareState.intervalSec,
    crossingSec: gsCompareState.crossingSec,
    style: gsCompareStyle(),
    startDelaySec: afterSec + 0.4
  });
  gsLater(gsCompareTimers, () => gsCompareFinish("First the sample, then your sound where your crossing time ends. Press Play for another."), doneAt + 0.2);
}

function gsCompareFinish(message, tone = "neutral") {
  suppressSrAnnouncements = false;
  gsCompareState.phase = "idle";
  gsCompareSetStartEnabled(true);
  gsCompareStatus(message, tone);
  document.getElementById("compareStartBtn")?.focus({ preventScroll: true });
}

function gsCompareStartHowMuch() {
  gsCompareState.phase = "howmuch";
  const direction = gsCompareState.expected;
  const title = `How much ${direction}? Tap to start, tap again to end.`;
  gsCompareStatus(title);
  gsOpenHowMuchPad({ title: `How much ${direction}?`, onDone: gsCompareHowMuchDone });
}

function gsCompareHowMuchDone(produced) {
  if (gsCompareState.phase !== "howmuch") return;
  const trueDiff = Math.abs(gsCompareState.intervalSec - gsCompareState.crossingSec);
  const margin = gsCompareState.marginSec;
  const correct = Math.abs(produced - trueDiff) <= margin;

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

  gsCompareState.phase = "replaying";
  const closing = correct ? "Your estimate was close. Press Play for another." : "Your estimate was off. Press Play for another.";
  const tone = correct ? "ok" : "warn";

  if (gsFeature("magnitudeReplay") === "b") {
    gsCompareStatus("First the sample against your crossing time, then your estimate against the real difference.");
    gsBeginQuiet();
    const firstDone = gsReplayJudgment({
      sampleSec: gsCompareState.intervalSec,
      crossingSec: gsCompareState.crossingSec,
      style: gsCompareStyle(),
      startDelaySec: 0.8
    });
    const secondDone = gsReplayMagnitudeB({ estimateSec: produced, trueDiffSec: trueDiff, marginSec: margin, startDelaySec: firstDone + 0.5 });
    gsLater(gsCompareTimers, () => gsCompareFinish(closing, tone), secondDone + 0.2);
    return;
  }

  gsCompareStatus("Your crossing time, then the right or wrong sound where the sample ended, then your sound at your estimate.");
  gsBeginQuiet();
  const doneAt = gsReplayMagnitudeA({
    crossingSec: gsCompareState.crossingSec,
    sampleSec: gsCompareState.intervalSec,
    estimateSec: produced,
    direction: gsCompareState.expected,
    marginSec: margin,
    style: gsCompareStyle(),
    startDelaySec: 0.8
  });
  gsLater(gsCompareTimers, () => gsCompareFinish(closing, tone), doneAt + 0.2);
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

/* ============================================================
 * AT THE STREET
 * ------------------------------------------------------------
 * Reworked in build 7, with Cindi and Dona:
 *   - no microphone, no "quiet level": accuracy depended on how the phone
 *     was held, and judging the conditions is taught by the instructor;
 *   - the student marks hearing or vision, saved with each vehicle;
 *   - detection is a swipe toward the side the vehicle comes from (left: the
 *     first half of the street; right: the full street), arrival is a tap,
 *     "it never came" is a swipe down. Buttons do the same for screen
 *     readers;
 *   - after arrival the STUDENT judges longer / shorter / about the same,
 *     exactly as in Comparison practice; the app does not give the answer;
 *   - replays: after every vehicle, only after an error, or never.
 * ============================================================ */

const gsLiveState = {
  phase: "closed", // closed | detect | arriving | judging | howmuch | feedback
  direction: "left",
  detectedAt: 0,
  warningSec: 0,
  crossingSec: 0,
  marginSec: 0.4,
  category: "same"
};

function gsLiveStreetFor(direction) {
  return direction === "left" ? "half" : "full";
}

function gsLiveSense() {
  return gsFeatureStyle("liveSense", "liveSense", "hearing");
}

function gsLiveJudgeEnabled() {
  return gsFeatureActive("liveJudge", "liveJudgeToggle");
}

function gsLiveHowMuchEnabled() {
  return gsFeatureActive("liveHowMuch", "liveHowMuchToggle");
}

function gsLiveReplayMode() {
  const value = gsFeature("liveReplay");
  if (value !== "choose") return value;
  return document.getElementById("liveReplaySelect")?.value || "always";
}

function gsLiveStatus(message, tone = "neutral", { announce = true } = {}) {
  const el = document.getElementById("liveStatus");
  const text = document.getElementById("liveStatusText");
  if (el) {
    (text || el).textContent = message;
    el.dataset.tone = tone;
  }
  const overlayStatus = document.getElementById("liveOverlayStatus");
  if (overlayStatus) overlayStatus.textContent = message;
  if (announce) announceScreenReader(message);
}

function gsLiveRenderPad() {
  const detect = document.getElementById("liveDetectButtons");
  const arrive = document.getElementById("liveArriveButtons");
  const surfaceText = document.getElementById("liveSurfaceText");
  const phase = gsLiveState.phase;
  if (detect) detect.hidden = phase !== "detect";
  if (arrive) arrive.hidden = phase !== "arriving";
  if (surfaceText) {
    surfaceText.textContent = phase === "arriving"
      ? "Tap when it passes in front of you · Swipe down if it never comes"
      : phase === "detect"
        ? "◀ Swipe left: from the left · Swipe right: from the right ▶"
        : "Listen";
  }
}

function gsLiveOpen() {
  ensureAudioContext();
  const { clearTime, fullTime } = getTimingInputs();
  if (!(clearTime > 0) || !(fullTime > 0)) {
    gsLiveStatus("Enter your crossing times in Instructor setup first.", "warn");
    return;
  }
  gsLiveState.phase = "detect";
  gsShowPad(document.getElementById("liveOverlay"));
  gsLiveRenderPad();
  document.getElementById("liveOverlayTitle")?.focus({ preventScroll: true });
  gsLiveStatus("Swipe left or right the moment you think you detect a vehicle, toward the side it is coming from.");
}

function gsLiveClose() {
  gsLiveCancelFlow();
  gsLiveState.phase = "closed";
  gsHidePad(document.getElementById("liveOverlay"));
  gsLiveRenderTally();
  gsLiveStatus("Press Start when you are in position.", "neutral", { announce: false });
  document.getElementById("liveStartBtn")?.focus({ preventScroll: true });
}

/** Cancel any vehicle in progress. Safe to call at any time. */
function gsLiveCancelFlow() {
  gsClearTimers(gsLiveTimers);
  gsClearHaptics();
  suppressSrAnnouncements = false;
  gsCloseAnswerPad();
  gsCloseHowMuchPad();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (gsLiveState.phase !== "closed") gsLiveState.phase = "detect";
  gsLiveRenderPad();
}

/* Called by the shell when leaving the screen. */
function gsLiveLeave() {
  gsLiveCancelFlow();
  gsLiveState.phase = "closed";
  gsHidePad(document.getElementById("liveOverlay"));
}

function gsLiveEnter() {
  gsLiveRenderTally();
}

function gsLiveDetect(direction) {
  if (gsLiveState.phase !== "detect") return;
  gsLiveState.direction = direction === "right" ? "right" : "left";
  gsLiveState.detectedAt = performance.now();
  gsLiveState.phase = "arriving";
  hapticCue("start");
  playConfirmTone();
  gsLiveRenderPad();
  gsLiveStatus(`From the ${gsLiveState.direction}. Tap when it passes in front of you, or swipe down if it never comes.`);
  document.getElementById("liveArrivedBtn")?.focus({ preventScroll: true });
}

function gsLiveNeverCame() {
  if (gsLiveState.phase !== "arriving") return;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    never: true,
    correct: false,
    userSec: 0,
    refSec: gsCrossingTimeFor(street),
    diffSec: 0,
    marginSec: gsEffectiveMargin("live", street)
  });
  playConfirmTone();
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  gsLiveRenderTally();
  gsLiveStatus("Noted: that vehicle never came. Ready for the next one.");
  document.querySelector("[data-live-detect='left']")?.focus({ preventScroll: true });
}

function gsLiveArrived() {
  if (gsLiveState.phase !== "arriving") return;
  const warningSec = (performance.now() - gsLiveState.detectedAt) / 1000;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLiveState.warningSec = warningSec;
  gsLiveState.crossingSec = gsCrossingTimeFor(street);
  gsLiveState.marginSec = gsEffectiveMargin("live", street);
  gsLiveState.category = gsClassifyInterval(warningSec, gsLiveState.crossingSec, gsLiveState.marginSec);
  hapticCue("marker");
  playConfirmTone();

  if (!gsLiveJudgeEnabled()) {
    gsLiveLog({ judged: false, answer: null, correct: false });
    gsLiveAfterVehicle({ judged: false, correct: true });
    return;
  }

  gsLiveState.phase = "judging";
  gsLiveRenderPad();
  const title = "Was that warning time longer, shorter, or about the same as your crossing?";
  gsLiveStatus(title, "neutral", { announce: false });
  gsOpenAnswerPad({ title, onAnswer: gsLiveAnswer });
  announceScreenReader(title);
}

function gsLiveLog({ judged, answer, correct }) {
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    judged,
    userSec: gsLiveState.warningSec,
    refSec: gsLiveState.crossingSec,
    diffSec: gsLiveState.warningSec - gsLiveState.crossingSec,
    correct,
    marginSec: gsLiveState.marginSec,
    answer,
    expected: gsLiveState.category
  });
}

function gsLiveAnswer(answer) {
  if (gsLiveState.phase !== "judging") return;
  const correct = answer === gsLiveState.category;
  gsLiveLog({ judged: true, answer, correct });
  gsShowResult(correct);
  const truth = GS_ANSWER_SHORT[gsLiveState.category];
  gsLiveStatus(correct ? `Correct. It was ${truth}.` : `Not quite. It was ${truth}.`, correct ? "ok" : "warn");

  const offerHowMuch = correct && gsLiveState.category !== "same" && gsLiveHowMuchEnabled();
  if (offerHowMuch) {
    gsLiveState.phase = "howmuch";
    gsLater(gsLiveTimers, () => {
      gsOpenHowMuchPad({ title: `How much ${gsLiveState.category}?`, onDone: gsLiveHowMuchDone });
      announceScreenReader(`How much ${gsLiveState.category}? Tap to start, tap again to end.`);
    }, 1.2);
    return;
  }
  gsLiveAfterVehicle({ judged: true, correct });
}

function gsLiveHowMuchDone(produced) {
  if (gsLiveState.phase !== "howmuch") return;
  const trueDiff = Math.abs(gsLiveState.warningSec - gsLiveState.crossingSec);
  const correct = Math.abs(produced - trueDiff) <= gsLiveState.marginSec;
  const street = gsLiveStreetFor(gsLiveState.direction);
  gsLogAttempt({
    activity: "live",
    street,
    direction: gsLiveState.direction,
    sense: gsLiveSense(),
    judged: true,
    userSec: produced,
    refSec: trueDiff,
    diffSec: produced - trueDiff,
    correct,
    marginSec: gsLiveState.marginSec,
    answer: "magnitude",
    expected: "magnitude"
  });
  gsLiveAfterVehicle({ judged: true, correct: true, magnitude: { produced, trueDiff, correct } });
}

/**
 * Feedback and replay after one vehicle, following the replay setting:
 *   always  replay after each vehicle
 *   errors  replay only if the judgment or the "how much" was wrong;
 *           otherwise just the right/wrong sound already given
 *   never   no replays, only the right/wrong sound
 */
function gsLiveAfterVehicle({ judged, correct, magnitude = null }) {
  gsLiveState.phase = "feedback";
  gsLiveRenderPad();
  gsLiveRenderTally();
  const mode = gsLiveReplayMode();

  if (magnitude) {
    // The magnitude estimate gets its own right/wrong sound first.
    gsLater(gsLiveTimers, () => gsShowResult(magnitude.correct), 0.2);
  }

  const wrong = (judged && !correct) || (magnitude && !magnitude.correct);
  const replay = mode === "always" || (mode === "errors" && wrong);
  if (!replay) {
    gsLater(gsLiveTimers, gsLiveReady, magnitude ? 1.4 : 1.0);
    return;
  }

  gsLater(gsLiveTimers, () => {
    gsBeginQuiet();
    let doneAt;
    const style = "continuous";
    if (magnitude) {
      if (gsFeature("magnitudeReplay") === "b") {
        const first = gsReplayJudgment({ sampleSec: gsLiveState.warningSec, crossingSec: gsLiveState.crossingSec, style, startDelaySec: 0.3 });
        doneAt = gsReplayMagnitudeB({ estimateSec: magnitude.produced, trueDiffSec: magnitude.trueDiff, marginSec: gsLiveState.marginSec, startDelaySec: first + 0.5 });
      } else {
        doneAt = gsReplayMagnitudeA({
          crossingSec: gsLiveState.crossingSec,
          sampleSec: gsLiveState.warningSec,
          estimateSec: magnitude.produced,
          direction: gsLiveState.category,
          marginSec: gsLiveState.marginSec,
          style,
          startDelaySec: 0.3
        });
      }
    } else {
      doneAt = gsReplayJudgment({ sampleSec: gsLiveState.warningSec, crossingSec: gsLiveState.crossingSec, style, startDelaySec: 0.3 });
    }
    gsLater(gsLiveTimers, gsLiveReady, doneAt + 0.2);
  }, magnitude ? 1.6 : 1.4);
}

function gsLiveReady() {
  suppressSrAnnouncements = false;
  if (gsLiveState.phase === "closed") return;
  gsLiveState.phase = "detect";
  gsLiveRenderPad();
  gsLiveStatus("Ready for the next vehicle.");
  document.querySelector("[data-live-detect='left']")?.focus({ preventScroll: true });
}

function gsLiveRenderTally() {
  const el = document.getElementById("liveTally");
  if (!el) return;
  const entries = gsLoadHistory().filter((e) => e.activity === "live" && e.answer !== "magnitude").slice(-20);
  const vehicles = entries.filter((e) => !e.never);
  if (!vehicles.length && !entries.length) {
    el.textContent = "No vehicles timed yet.";
    return;
  }
  const judged = vehicles.filter((e) => e.judged === true);
  const right = judged.filter((e) => e.correct).length;
  const never = entries.length - vehicles.length;
  const parts = [`Last ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`];
  if (judged.length) parts.push(`${right} of ${judged.length} judged correctly`);
  if (never) parts.push(`${never} never came`);
  el.textContent = parts.join(" · ");
}

/* ---------------- init ---------------- */

/* The loudness and pitch controls appear in both comparison activities and
 * share one setting. Built here so the two copies cannot drift apart. */
function gsBuildSampleControls() {
  document.querySelectorAll(".sample-sound-controls").forEach((wrap, index) => {
    const prefix = wrap.closest("#screen-signal") ? "prep" : "compare";
    wrap.innerHTML = `
      <label for="${prefix}Volume">Sound loudness</label>
      <div class="range-row">
        <input id="${prefix}Volume" class="sample-volume" type="range" min="20" max="100" step="5" />
        <output for="${prefix}Volume" class="sample-volume-out" aria-hidden="true"></output>
      </div>
      <label for="${prefix}Pitch">Sound pitch</label>
      <div class="range-row">
        <input id="${prefix}Pitch" class="sample-pitch" type="range" min="0" max="${GS_SAMPLE_PITCHES.length - 1}" step="1" />
        <output for="${prefix}Pitch" class="sample-pitch-out" aria-hidden="true"></output>
      </div>
      <p class="field-help">The sound stays at one loudness from start to end. Set it loud enough to hear clearly where you practice. A lower pitch can be easier to hear for some people.</p>
      <button class="settings-action sample-preview-btn" id="${prefix}PreviewBtn" type="button">Play a two-second sample</button>`;
    void index;
  });

  const syncAll = () => {
    const volume = String(Math.round(gsSampleVolume() * 100));
    const pitch = gsSamplePitchIndex();
    document.querySelectorAll(".sample-volume").forEach((input) => { input.value = volume; input.setAttribute("aria-valuetext", `${volume} percent`); });
    document.querySelectorAll(".sample-volume-out").forEach((out) => { out.textContent = `${volume}%`; });
    document.querySelectorAll(".sample-pitch").forEach((input) => {
      input.value = String(pitch);
      input.setAttribute("aria-valuetext", GS_SAMPLE_PITCHES[pitch].label);
    });
    document.querySelectorAll(".sample-pitch-out").forEach((out) => { out.textContent = GS_SAMPLE_PITCHES[pitch].label; });
  };
  syncAll();

  document.querySelectorAll(".sample-volume").forEach((input) => {
    input.addEventListener("input", () => {
      input.closest(".range-row").querySelector("output").textContent = `${input.value}%`;
      input.setAttribute("aria-valuetext", `${input.value} percent`);
    });
    input.addEventListener("change", () => {
      gsSetSampleVolume(Number(input.value) / 100);
      syncAll();
      announceScreenReader(`Sound loudness ${input.value} percent.`);
    });
  });
  document.querySelectorAll(".sample-pitch").forEach((input) => {
    const label = () => GS_SAMPLE_PITCHES[Number(input.value)]?.label || "";
    input.addEventListener("input", () => {
      input.closest(".range-row").querySelector("output").textContent = label();
      input.setAttribute("aria-valuetext", label());
    });
    input.addEventListener("change", () => {
      gsSetSamplePitchIndex(Number(input.value));
      syncAll();
      announceScreenReader(`Sound pitch ${label()}.`);
      gsClearHaptics();
      gsPlaySample(0.6, 0.05, "continuous", { visual: false, haptic: false });
    });
  });
  document.querySelectorAll(".sample-preview-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      gsClearHaptics();
      gsPlaySample(2.0, 0.05, "continuous", { visual: false });
    });
  });
}

function gsComparisonInit() {
  gsBuildSampleControls();

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

  document.getElementById("compareStartBtn")?.addEventListener("click", () => gsCompareBegin());

  document.querySelectorAll("#answerOverlay .answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => gsAnswerPadAnswer(btn.dataset.answer));
  });
  const answerOverlay = document.getElementById("answerOverlay");
  if (answerOverlay) {
    gsBindSwipeSurface(answerOverlay, () => (gsFeature("compareSwipe") === "off" ? {} : {
      up: () => gsAnswerPadAnswer("longer"),
      down: () => gsAnswerPadAnswer("shorter"),
      tap: () => gsAnswerPadAnswer("same")
    }));
    answerOverlay.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") { event.preventDefault(); gsAnswerPadAnswer("longer"); }
      if (event.key === "ArrowDown") { event.preventDefault(); gsAnswerPadAnswer("shorter"); }
    });
  }

  document.getElementById("compareFollowUpBtn")?.addEventListener("click", gsHowMuchTap);
  const howMuchOverlay = document.getElementById("howMuchOverlay");
  if (howMuchOverlay) gsBindSwipeSurface(howMuchOverlay, () => ({ tap: gsHowMuchTap }));

  // Student-side switches, remembered between visits.
  ["compareFollowUp", "compareRandomDelay", "liveHowMuchToggle"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    const key = `om-${id}`;
    box.checked = localStorage.getItem(key) === "true";
    box.addEventListener("change", () => localStorage.setItem(key, String(box.checked)));
  });
  const judge = document.getElementById("liveJudgeToggle");
  if (judge) {
    judge.checked = localStorage.getItem("om-liveJudgeToggle") !== "false";
    judge.addEventListener("change", () => localStorage.setItem("om-liveJudgeToggle", String(judge.checked)));
  }
  const replaySelect = document.getElementById("liveReplaySelect");
  if (replaySelect) {
    const stored = localStorage.getItem("om-live-replay");
    if (["always", "errors", "never"].includes(stored)) replaySelect.value = stored;
    replaySelect.addEventListener("change", () => localStorage.setItem("om-live-replay", replaySelect.value));
  }
  document.querySelectorAll("input[name='liveSense']").forEach((input) => {
    const stored = localStorage.getItem("om-live-sense");
    if (stored && input.value === stored) input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) localStorage.setItem("om-live-sense", input.value);
    });
  });

  // At the street.
  document.getElementById("liveStartBtn")?.addEventListener("click", gsLiveOpen);
  document.getElementById("liveDoneBtn")?.addEventListener("click", gsLiveClose);
  document.querySelectorAll("[data-live-detect]").forEach((btn) => {
    btn.addEventListener("click", () => gsLiveDetect(btn.dataset.liveDetect));
  });
  document.getElementById("liveArrivedBtn")?.addEventListener("click", gsLiveArrived);
  document.getElementById("liveNeverBtn")?.addEventListener("click", gsLiveNeverCame);
  const liveOverlay = document.getElementById("liveOverlay");
  if (liveOverlay) {
    gsBindSwipeSurface(liveOverlay, () => {
      if (gsLiveState.phase === "detect") {
        return { left: () => gsLiveDetect("left"), right: () => gsLiveDetect("right") };
      }
      if (gsLiveState.phase === "arriving") {
        return { tap: gsLiveArrived, up: gsLiveArrived, down: gsLiveNeverCame };
      }
      return {};
    });
  }

  gsCompareSetStartEnabled(true);
  gsCompareRenderScore();
  gsLiveRenderTally();
}
