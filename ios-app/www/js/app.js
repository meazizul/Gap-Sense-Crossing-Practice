/* ============================================================
 * Gap Sense — shell: navigation, progress, sharing, help
 * ============================================================ */

const GS_SCREENS = ["home", "measure", "practice", "compare", "live", "progress", "help"];

const GS_SCREEN_TITLES = {
  home: "Gap Sense",
  measure: "Measure my crossing",
  practice: "Practise my timing",
  compare: "Compare practice",
  live: "At the street",
  progress: "Progress",
  help: "Help"
};

/* The four activities, in the order the skill is actually taught. */
const GS_STEP_ORDER = ["measure", "practice", "compare", "live"];

let gsCurrentScreen = "home";

function gsShowScreen(name) {
  if (!GS_SCREENS.includes(name)) name = "home";
  gsCurrentScreen = name;

  GS_SCREENS.forEach((screen) => {
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.hidden = screen !== name;
  });

  const back = document.getElementById("backBtn");
  if (back) back.hidden = name === "home";

  const title = document.getElementById("screenTitle");
  if (title) title.textContent = GS_SCREEN_TITLES[name];

  // Stop anything still playing from the previous screen.
  stopVisualReplay();
  gsHideIntervalVisual();

  if (name === "progress") gsRenderProgress();
  if (name === "home") gsRenderHome();
  if (name === "live") gsNoiseStart().then(() => gsLiveRenderNoise());
  if (name !== "live") gsNoiseStop();

  // Move focus so screen-reader users land in the new screen, not nowhere.
  const heading = document.querySelector(`#screen-${name} .screen-heading`);
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

/* ============================================================
 * Visual channel for intervals
 * ------------------------------------------------------------
 * The existing replay overlay is driven by the AudioContext clock and owned by
 * the practice engine. The comparison tasks need something simpler: hold a
 * shape on screen for exactly as long as the interval lasts, so a Deaf user
 * sees the duration they cannot hear.
 * ============================================================ */

let gsIntervalVisualTimers = [];

function gsHideIntervalVisual() {
  gsIntervalVisualTimers.forEach((id) => clearTimeout(id));
  gsIntervalVisualTimers = [];
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  if (!overlay) return;
  overlay.dataset.active = "false";
  if (flash) flash.style.background = "transparent";
  if (shape) shape.style.display = "none";
}

function gsShowIntervalVisual(startDelaySec, durationSec, type = "user") {
  if (!visualOutputEnabled()) return;
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  if (!overlay || !flash || !shape) return;

  gsIntervalVisualTimers.push(setTimeout(() => {
    overlay.dataset.active = "true";
    flash.style.background = "#000000";
    if (type === "user") {
      flash.style.background = getUserFlashColor();
      shape.style.display = "none";
    } else {
      shape.dataset.type = type;
      shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
      shape.style.display = "block";
    }
  }, startDelaySec * 1000));

  gsIntervalVisualTimers.push(setTimeout(() => {
    gsHideIntervalVisual();
  }, (startDelaySec + durationSec) * 1000));
}

/* ============================================================
 * Home
 * ============================================================ */

function gsHasTimes() {
  const { clearTime, fullTime } = getTimingInputs();
  return Number.isFinite(clearTime) && clearTime > 0 && Number.isFinite(fullTime) && fullTime > 0;
}

function gsRenderHome() {
  const ready = gsHasTimes();
  const banner = document.getElementById("homeSetupBanner");
  if (banner) banner.hidden = ready;

  // Gate the later steps until there is something to compare against — the
  // whole point is that each step depends on the one before it.
  ["practice", "compare", "live"].forEach((step) => {
    const card = document.querySelector(`.step-card[data-screen="${step}"]`);
    if (!card) return;
    card.classList.toggle("locked", !ready);
    const btn = card.querySelector("button");
    if (btn) {
      btn.disabled = !ready;
      btn.setAttribute("aria-disabled", String(!ready));
    }
  });

  const summary = gsSummary();
  const el = document.getElementById("homeProgressNote");
  if (el) {
    el.textContent = summary.total
      ? `${summary.total} attempts over ${summary.daysPracticed} day${summary.daysPracticed === 1 ? "" : "s"}`
      : "No practice recorded yet";
  }

  if (typeof gsRenderDemoNote === "function") gsRenderDemoNote();

  const times = document.getElementById("homeTimes");
  if (times) {
    const { clearTime, fullTime } = getTimingInputs();
    times.textContent = ready
      ? `Half street ${clearTime.toFixed(2)}s · Full street ${fullTime.toFixed(2)}s`
      : "Crossing times not set";
  }
}

/* ============================================================
 * Progress
 * ============================================================ */

function gsRenderProgress() {
  const summary = gsSummary();
  const wrap = document.getElementById("progressBody");
  if (!wrap) return;

  if (!summary.total) {
    wrap.innerHTML = `<p class="field-help">Nothing recorded yet. Practice will show up here.</p>`;
    return;
  }

  const cards = GS_STEP_ORDER.map((activity) => {
    const stats = summary.byActivity[activity];
    const label = GS_ACTIVITY_LABELS[activity] || activity;
    if (!stats) {
      return `<div class="progress-card"><span class="progress-label">${label}</span>
        <span class="progress-value">—</span><span class="progress-note">not started</span></div>`;
    }
    if (activity === "measure") {
      return `<div class="progress-card"><span class="progress-label">${label}</span>
        <span class="progress-value">${stats.total}</span>
        <span class="progress-note">walk${stats.total === 1 ? "" : "s"} recorded</span></div>`;
    }
    const pct = Math.round((stats.correct / stats.total) * 100);
    return `<div class="progress-card"><span class="progress-label">${label}</span>
      <span class="progress-value">${pct}%</span>
      <span class="progress-note">${stats.correct} of ${stats.total}</span></div>`;
  }).join("");

  // A small sparkline-style run of the last 20 practice attempts.
  const recent = gsHistoryFor("practice", "", 20);
  const dots = recent
    .map((e) => `<span class="run-dot ${e.correct ? "ok" : "miss"}" aria-hidden="true"></span>`)
    .join("");
  const runLabel = recent.length
    ? `<p class="field-help">Last ${recent.length} timing attempts, oldest first:
       ${recent.filter((e) => e.correct).length} within margin.</p>
       <div class="run-strip" role="img" aria-label="Recent attempts: ${recent
         .map((e) => (e.correct ? "within" : "outside"))
         .join(", ")}">${dots}</div>`
    : "";

  const adaptive = gsLoadAdaptive();
  let adaptiveNote = "";
  if (adaptive.enabled) {
    const lanes = Object.entries(adaptive.lanes)
      .map(([key, lane]) => `<li>${key}: margin now <strong>${lane.margin.toFixed(2)}s</strong>${
        lane.learnerFloor ? ` (floor held at ${lane.learnerFloor.toFixed(2)}s)` : ""
      }</li>`)
      .join("");
    adaptiveNote = lanes
      ? `<div class="setup-group"><p class="setup-heading">Adaptive margin</p><ul class="plain-list">${lanes}</ul></div>`
      : "";
  }

  wrap.innerHTML = `<div class="progress-grid">${cards}</div>${runLabel}${adaptiveNote}`;
}

/* ============================================================
 * Sharing a report with the instructor
 * ------------------------------------------------------------
 * Fully opt-in: the student sees exactly what would be sent, in full, before
 * anything is copied anywhere. Nothing is transmitted by the app itself.
 * ============================================================ */

function gsPreviewReport() {
  const box = document.getElementById("reportPreview");
  const wrap = document.getElementById("reportPreviewWrap");
  if (!box || !wrap) return;
  box.value = gsBuildReport({ studentName: document.getElementById("studentName")?.value.trim() });
  wrap.hidden = false;
  announceScreenReader("Report ready to review. Nothing has been sent.");
}

async function gsCopyReport() {
  const box = document.getElementById("reportPreview");
  if (!box || !box.value) gsPreviewReport();
  await copyTextToClipboard(document.getElementById("reportPreview").value);
  announceScreenReader("Report copied. You can now paste it into an email or message.");
  const note = document.getElementById("reportNote");
  if (note) note.textContent = "Copied. Paste it into an email or message to send it.";
}

function gsClearData() {
  gsClearHistory();
  gsRenderProgress();
  gsRenderHome();
  const note = document.getElementById("reportNote");
  if (note) note.textContent = "All practice history deleted from this device.";
  announceScreenReader("All practice history deleted.");
}

/* ============================================================
 * First-run tutorial
 * ============================================================ */

const GS_TUTORIAL_KEY = "om-tutorial-seen";

function gsRunTutorial() {
  const dialog = document.getElementById("tutorialModal");
  if (!dialog) return;
  lockPageScroll();
  setMainContentInert(true);
  dialog.showModal();
  document.getElementById("tutorialTitle")?.focus();
  localStorage.setItem(GS_TUTORIAL_KEY, "true");
}

function gsTutorialDemo(kind) {
  ensureAudioContext();
  if (kind === "acceptable") {
    playFeedbackTone("acceptable", 0.05);
    announceScreenReader("That is the within-margin sound.");
  } else if (kind === "outside") {
    playFeedbackTone("outside", 0.05);
    announceScreenReader("That is the outside-margin sound.");
  } else {
    playUserMarkerTone(0.05);
    announceScreenReader("That is your own marker sound.");
  }
}


/* ============================================================
 * QUICK-START / DEMO MODE
 * ------------------------------------------------------------
 * A conference participant has about thirty seconds and is often using a
 * screen reader on a phone they are holding one-handed. Asking them to measure
 * a crossing, or to type two numbers into Settings, before anything works at
 * all is far too much.
 *
 * So: example times can be loaded in one tap, and the link handed out at the
 * conference can carry "?demo=1" to do it automatically. The app then opens
 * straight into the practice screen, ready to use, with a clearly announced
 * note that the times are examples rather than the participant's own.
 * ============================================================ */

const GS_DEMO_KEY = "om-demo-times";
const GS_DEMO_CLEAR = "4.0";   // typical half-street clear time
const GS_DEMO_FULL = "8.0";    // typical full-street crossing
const GS_DEMO_MARGIN = "0.5";  // the value historically taught in workshops

function gsUsingDemoTimes() {
  return localStorage.getItem(GS_DEMO_KEY) === "true";
}

function gsLoadDemoTimes({ goToPractice = true } = {}) {
  clearTimeInput.value = GS_DEMO_CLEAR;
  fullTimeInput.value = GS_DEMO_FULL;
  marginInput.value = GS_DEMO_MARGIN;
  localStorage.setItem("om-clear-time", GS_DEMO_CLEAR);
  localStorage.setItem("om-full-time", GS_DEMO_FULL);
  localStorage.setItem("om-margin", GS_DEMO_MARGIN);
  localStorage.setItem(GS_DEMO_KEY, "true");

  refreshTimingRequirementPrompt();
  updateNextPrompt();
  gsRenderHome();
  gsRenderDemoNote();

  if (goToPractice) {
    gsShowScreen("practice");
    announceScreenReader(
      "Example times loaded. Press the big button to begin, then press it again when you think you would have reached the other side."
    );
  }
}

function gsClearDemoFlag() {
  localStorage.removeItem(GS_DEMO_KEY);
  gsRenderDemoNote();
}

function gsRenderDemoNote() {
  document.querySelectorAll(".demo-note").forEach((el) => {
    el.hidden = !gsUsingDemoTimes();
  });
  const btn = document.getElementById("tryDemoBtn");
  if (btn) btn.hidden = gsHasTimes() && !gsUsingDemoTimes();
}

/* ============================================================
 * Boot
 * ============================================================ */

function gsBindShell() {
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => gsShowScreen(el.dataset.goto));
  });

  const back = document.getElementById("backBtn");
  if (back) back.addEventListener("click", () => gsShowScreen("home"));

  const adaptiveToggle = document.getElementById("adaptiveMarginToggle");
  if (adaptiveToggle) {
    adaptiveToggle.checked = gsAdaptiveEnabled();
    adaptiveToggle.addEventListener("change", () => {
      gsSetAdaptiveEnabled(adaptiveToggle.checked);
      gsCompareRenderScore();
      announceScreenReader(
        adaptiveToggle.checked
          ? "Adaptive margin on. The margin will tighten as accuracy improves."
          : "Adaptive margin off. The margin stays as set."
      );
    });
  }

  const resetFloor = document.getElementById("resetLearnerFloorBtn");
  if (resetFloor) {
    resetFloor.addEventListener("click", () => {
      gsResetLearnerFloor();
      gsRenderProgress();
      announceScreenReader("Learner floor cleared.");
    });
  }

  document.getElementById("previewReportBtn")?.addEventListener("click", gsPreviewReport);
  document.getElementById("copyReportBtn")?.addEventListener("click", gsCopyReport);
  document.getElementById("clearDataBtn")?.addEventListener("click", gsClearData);

  document.getElementById("openTutorialBtn")?.addEventListener("click", gsRunTutorial);
  document.getElementById("closeTutorial")?.addEventListener("click", () => {
    document.getElementById("tutorialModal")?.close();
  });
  document.getElementById("tutorialModal")?.addEventListener("close", () => {
    if (!settingsModal.open && !a11yModal.open) {
      unlockPageScroll();
      setMainContentInert(false);
    }
  });
  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", () => gsTutorialDemo(btn.dataset.demo));
  });

  document.getElementById("tryDemoBtn")?.addEventListener("click", () => gsLoadDemoTimes());

  // Keep home in step with times edited in Settings. Editing a time by hand, or
  // saving a measured one, means these are no longer the example values.
  [clearTimeInput, fullTimeInput].forEach((input) => {
    input?.addEventListener("change", () => {
      gsClearDemoFlag();
      gsRenderHome();
    });
  });
}

function gsBoot() {
  gsBindShell();
  gsMeasureInit();
  gsComparisonInit();

  // ?demo=1 — the conference link. Straight in, nothing to set up.
  const params = new URLSearchParams(window.location.search);
  const wantsDemo = params.get("demo") === "1";

  if (wantsDemo) {
    localStorage.setItem(GS_TUTORIAL_KEY, "true"); // no modal in the way
    if (!gsHasTimes() || gsUsingDemoTimes()) {
      gsLoadDemoTimes();
    } else {
      gsShowScreen("practice");
    }
    gsRenderDemoNote();
    return;
  }

  gsShowScreen("home");
  gsRenderDemoNote();

  if (!localStorage.getItem(GS_TUTORIAL_KEY)) {
    // Let the first paint settle before taking over the screen.
    setTimeout(() => gsRunTutorial(), 700);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", gsBoot);
} else {
  gsBoot();
}
