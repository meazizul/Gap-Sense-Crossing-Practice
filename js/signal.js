/* ============================================================
 * Gap Sense — Time it from a signal
 * ============================================================
 *
 * Cindi's first comparison step (7 Oct 2026): the student "judges time
 * appropriately when NOT controlling when the interval starts". In Practice
 * the student starts the clock themselves; here the app does, after a random
 * wait, and the student presses when they think their crossing time is up.
 * It is how she teaches at the kerb: "you hear a car coming… <wait> now."
 *
 * Flow:  Ready  →  random wait  →  SIGNAL (two blips, a pulse, a flash)
 *        →  student presses  →  overlapped replay, as in Practice
 *
 * A press before the signal is a false start; nothing is recorded.
 * ============================================================ */

const gsSignalTimers = [];

const gsSignalState = {
  street: "full",
  phase: "idle",   // idle | waiting | timing | replaying
  signalAt: 0
};

function gsSignalCrossing() {
  return gsCrossingTimeFor(gsSignalState.street);
}

function gsSignalLongWaits() {
  return Boolean(document.getElementById("signalLongWaits")?.checked);
}

function gsSignalStatus(message, tone = "neutral") {
  const el = document.getElementById("signalStatus");
  const text = document.getElementById("signalStatusText");
  if (!el) return;
  (text || el).textContent = message;
  el.dataset.tone = tone;
  announceScreenReader(message);
}

function gsSignalUpdateButton() {
  const btn = document.getElementById("signalBtn");
  const label = document.getElementById("signalBtnLabel");
  const hint = document.getElementById("signalBtnHint");
  if (!btn || !label) return;
  btn.classList.remove("running", "stage-start", "stage-finish", "idle");
  btn.disabled = false;

  if (gsSignalState.phase === "waiting") {
    label.textContent = "WAIT";
    if (hint) hint.textContent = "Press only after the signal";
    btn.classList.add("running", "stage-start");
    btn.setAttribute("aria-label", "Wait for the signal.");
    return;
  }
  if (gsSignalState.phase === "timing") {
    label.textContent = "NOW";
    if (hint) hint.textContent = "Press when your crossing time is up";
    btn.classList.add("running", "stage-finish");
    btn.setAttribute("aria-label", "Press when your crossing time is up.");
    return;
  }
  if (gsSignalState.phase === "replaying") {
    label.textContent = "LISTEN";
    if (hint) hint.textContent = "Replaying";
    btn.classList.add("running");
    btn.disabled = true;
    btn.setAttribute("aria-label", "Replaying.");
    return;
  }
  label.textContent = "READY";
  if (hint) hint.textContent = "Press, then wait for the signal";
  btn.classList.add("idle");
  btn.setAttribute("aria-label", "Ready. Press, then wait for the signal.");
}

/** Cancel the flow. Safe to call at any time. */
function gsSignalCancel() {
  gsClearTimers(gsSignalTimers);
  gsClearHaptics();
  suppressSrAnnouncements = false;
  gsSignalState.phase = "idle";
  gsSignalState.signalAt = 0;
  gsSignalUpdateButton();
  if (typeof gsHideIntervalVisual === "function") gsHideIntervalVisual();
  if (typeof stopVisualReplay === "function") stopVisualReplay();
}

function gsSignalPress() {
  ensureAudioContext();
  const phase = gsSignalState.phase;

  if (phase === "replaying") return;

  if (phase === "idle") {
    const crossing = gsSignalCrossing();
    if (!Number.isFinite(crossing) || crossing <= 0) {
      gsSignalStatus("Enter your crossing times in Settings first, or open the link your instructor sent.", "warn");
      return;
    }
    gsSignalState.phase = "waiting";
    gsSignalUpdateButton();
    playConfirmTone();
    gsSignalStatus("Wait for the signal. Then press when you think your crossing time is up.");
    const waitSec = gsSignalLongWaits() ? 3 + Math.random() * 5 : 1.5 + Math.random() * 2.5;
    gsLater(gsSignalTimers, gsSignalFire, waitSec);
    return;
  }

  if (phase === "waiting") {
    // False start. Nothing is recorded.
    gsSignalCancel();
    playFeedbackTone("outside", 0.02);
    hapticCue("reference_bad");
    gsSignalStatus("Too early. That was before the signal. Press Ready to try again.", "warn");
    return;
  }

  if (phase === "timing") {
    const produced = (performance.now() - gsSignalState.signalAt) / 1000;
    playConfirmTone();
    hapticCue("marker");
    gsSignalResolve(produced);
  }
}

function gsSignalFire() {
  gsSignalState.phase = "timing";
  gsSignalState.signalAt = performance.now();
  gsSignalUpdateButton();
  // The signal: two quick blips, a pulse, and a short flash. Deliberately not
  // the marker tone, so the replay's "your press" marker sounds different.
  playReferenceTick(0);
  hapticCue("start");
  if (typeof gsShowIntervalVisual === "function") gsShowIntervalVisual(0, 0.35);
  // Not announced: speech would land on top of the timing.
}

function gsSignalResolve(producedSec) {
  const street = gsSignalState.street;
  const crossingSec = gsSignalCrossing();
  const marginSec = gsEffectiveMargin("signal", street);
  const latency = (typeof audioContext !== "undefined" && audioContext)
    ? (audioContext.baseLatency || 0) + (audioContext.outputLatency || 0)
    : 0;
  const within = Math.abs(producedSec - crossingSec) <= marginSec + Math.max(0.02, latency);

  gsLogAttempt({
    activity: "signal",
    street,
    userSec: producedSec,
    refSec: crossingSec,
    diffSec: producedSec - crossingSec,
    correct: within,
    marginSec
  });
  gsSignalRenderScore();

  gsSignalState.phase = "replaying";
  gsSignalUpdateButton();
  gsSignalStatus("Replaying your press against your crossing time.");
  suppressSrAnnouncements = true;

  const doneAt = gsReplayOverlapped({
    sampleSec: producedSec,
    crossingSec,
    style: "ticks",
    marginSec,
    startDelaySec: 1.0
  });
  gsLater(gsSignalTimers, () => {
    suppressSrAnnouncements = false;
    gsSignalState.phase = "idle";
    gsSignalUpdateButton();
    gsSignalStatus(within ? "Within the margin. Ready for another." : "Outside the margin. Ready for another.", within ? "ok" : "warn");
  }, doneAt + 0.2);
}

function gsSignalRenderScore() {
  const el = document.getElementById("signalScore");
  if (!el) return;
  const recent = gsHistoryFor("signal", gsSignalState.street, 10);
  const within = recent.filter((entry) => entry.correct).length;
  const margin = gsEffectiveMargin("signal", gsSignalState.street);
  const note = `margin ${margin.toFixed(2)}s${gsAdaptiveEnabled() ? " (adaptive)" : ""}`;
  el.textContent = recent.length
    ? `Last ${recent.length}: ${within} within margin · ${note}`
    : `No attempts yet · ${note}`;
}

function gsSignalSetStreet(street) {
  gsSignalCancel();
  gsSignalState.street = street;
  gsSignalRenderScore();
  gsSignalStatus(`${street === "half" ? "First half of the street" : "Full street"} selected. Press Ready when you are.`);
}

function gsSignalInit() {
  document.querySelectorAll("input[name='signalStreet']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) gsSignalSetStreet(input.value);
    });
  });
  const longWaits = document.getElementById("signalLongWaits");
  if (longWaits) {
    longWaits.checked = localStorage.getItem("om-signal-long-waits") === "true";
    longWaits.addEventListener("change", () => {
      localStorage.setItem("om-signal-long-waits", String(longWaits.checked));
    });
  }
  const btn = document.getElementById("signalBtn");
  if (btn) btn.addEventListener("click", gsSignalPress);
  gsSignalUpdateButton();
  gsSignalRenderScore();
}
