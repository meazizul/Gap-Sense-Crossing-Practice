/* ============================================================
 * Gap Sense — shell: navigation, progress, sharing, help
 * ============================================================ */

const GS_SCREENS = ["home", "practice", "signal", "compare", "live", "progress", "help"];

const GS_SCREEN_TITLES = {
  home: "Gap Sense",
  practice: "Practise my timing",
  signal: "Time it from a signal",
  compare: "Compare practice",
  live: "At the street",
  progress: "Progress",
  help: "Help"
};

/* The four activities, in the order the skill is taught. Crossing times are
 * measured and set by the O&M instructor (Settings, or a link), not by the
 * app: the "Measure my crossing" step was removed on Cindi's advice. */
const GS_STEP_ORDER = ["practice", "signal", "compare", "live"];

let gsCurrentScreen = "home";

/* Shown under Help → About so a tester can confirm which build they have.
 * Bump GS_APP_BUILD with CURRENT_PROJECT_VERSION (iOS), versionCode (Android)
 * and CACHE_VERSION (sw.js). In the native app the real bundle values are
 * read from the App plugin and override these. */
const GS_APP_VERSION = "1.0";
const GS_APP_BUILD = "4";
const GS_APP_DATE = "10 October 2026";

async function gsRenderAbout() {
  const el = document.getElementById("aboutVersion");
  if (!el) return;
  let version = GS_APP_VERSION;
  let build = GS_APP_BUILD;
  let channel = "web";
  try {
    const AppPlugin = window.Capacitor?.Plugins?.App;
    if (window.Capacitor?.isNativePlatform?.() && AppPlugin?.getInfo) {
      const info = await AppPlugin.getInfo();
      if (info?.version) version = info.version;
      if (info?.build) build = info.build;
      channel = window.Capacitor.getPlatform?.() === "android" ? "Android app" : "iPhone app";
    }
  } catch (error) {
    /* fall back to the constants */
  }
  el.textContent = `Gap Sense version ${version}, build ${build} (${channel}), ${GS_APP_DATE}.`;
}

/*
 * Stop whatever any activity is doing. Called on every screen change so that
 * leaving mid-run never leaves timers firing, speech suppressed, Settings
 * locked, or the microphone open.
 */
function gsCancelActivities() {
  if (typeof cancelPractice === "function") cancelPractice();
  if (typeof gsCompareCancel === "function") gsCompareCancel();
  if (typeof gsLiveCancelFlow === "function") gsLiveCancelFlow();
  if (typeof gsSignalCancel === "function") gsSignalCancel();
  if (typeof gsClearHaptics === "function") gsClearHaptics();
  suppressSrAnnouncements = false;
  stopVisualReplay();
  gsHideIntervalVisual();
}

function gsShowScreen(name) {
  if (!GS_SCREENS.includes(name)) name = "home";
  const leaving = gsCurrentScreen;
  gsCancelActivities();
  if (leaving === "live" && name !== "live" && typeof gsLiveLeave === "function") gsLiveLeave();
  gsCurrentScreen = name;

  GS_SCREENS.forEach((screen) => {
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.hidden = screen !== name;
  });

  const back = document.getElementById("backBtn");
  if (back) back.hidden = name === "home";

  const title = document.getElementById("screenTitle");
  if (title) title.textContent = GS_SCREEN_TITLES[name];

  if (name === "progress") gsRenderProgress();
  if (name === "home") gsRenderHome();
  if (name === "help") gsRenderAbout();
  if (name === "practice" && typeof renderPracticeScore === "function") renderPracticeScore();
  if (name === "signal" && typeof gsSignalRenderScore === "function") gsSignalRenderScore();
  if (name === "compare" && typeof gsCompareRenderScore === "function") gsCompareRenderScore();
  if (name === "live" && typeof gsLiveEnter === "function") gsLiveEnter();

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
 * The replay overlay is driven by the AudioContext clock and owned by the
 * practice engine. Playing a sample needs something simpler: hold a flash on
 * screen for exactly as long as the interval lasts, so a Deaf user sees the
 * duration they cannot hear.
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

  // Every activity compares against the crossing times, so all of them wait
  // until the times exist.
  GS_STEP_ORDER.forEach((step) => {
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

  gsRenderDemoNote();

  // The numbers themselves stay in Settings. A student who reads "8.0 s" on
  // the home screen is invited to count, which is the one thing the method
  // forbids. Instructors see and edit the values in Settings.
  const times = document.getElementById("homeTimes");
  if (times) {
    times.textContent = ready
      ? (gsUsingDemoTimes() ? "Using example crossing times" : "Crossing times set")
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
    const pct = Math.round((stats.correct / stats.total) * 100);
    const noun = activity === "live" ? "gave enough warning" : "within margin";
    return `<div class="progress-card"><span class="progress-label">${label}</span>
      <span class="progress-value">${pct}%</span>
      <span class="progress-note">${stats.correct} of ${stats.total} ${noun}</span></div>`;
  }).join("");

  // A small run of the last 20 timing attempts (practice and signal).
  const recent = gsLoadHistory()
    .filter((e) => e.activity === "practice" || e.activity === "signal")
    .slice(-20);
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
      .map(([key, lane]) => `<li>${gsLaneLabel(key)}: margin now <strong>${Number(lane.margin).toFixed(2)}s</strong></li>`)
      .join("");
    adaptiveNote = lanes
      ? `<div class="setup-group"><p class="setup-heading">Adaptive margin (experimental)</p><ul class="plain-list">${lanes}</ul></div>`
      : "";
  }

  wrap.innerHTML = `<div class="progress-grid">${cards}</div>${runLabel}${adaptiveNote}`;
}

/* ============================================================
 * Sharing a report with the instructor
 * ------------------------------------------------------------
 * Fully opt-in: the student sees exactly what would be sent, in full, before
 * anything is copied or handed to the mail app. Nothing is transmitted by the
 * app itself. Identity is the short client code from Settings, never a name.
 * ============================================================ */

function gsReportText() {
  return gsBuildReport({ clientCode: typeof getClientCode === "function" ? getClientCode() : "" });
}

function gsRenderReportControls() {
  const email = typeof getInstructorEmail === "function" ? getInstructorEmail() : "";
  const emailBtn = document.getElementById("emailReportBtn");
  if (emailBtn) emailBtn.hidden = !email;
  const whom = document.getElementById("reportRecipient");
  if (whom) {
    whom.textContent = email
      ? `Instructor email from Settings: ${email}`
      : "No instructor email set. Add one in Settings to email the report directly, or copy it and paste it anywhere.";
  }
}

function gsPreviewReport() {
  const box = document.getElementById("reportPreview");
  const wrap = document.getElementById("reportPreviewWrap");
  if (!box || !wrap) return;
  box.value = gsReportText();
  wrap.hidden = false;
  gsRenderReportControls();
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

function gsEmailReport() {
  const email = typeof getInstructorEmail === "function" ? getInstructorEmail() : "";
  if (!email) return;
  const box = document.getElementById("reportPreview");
  if (!box || !box.value) gsPreviewReport();
  const body = document.getElementById("reportPreview").value;
  const code = typeof getClientCode === "function" ? getClientCode() : "";
  const subject = `Gap Sense practice report${code ? ` — ${code}` : ""}`;
  // Opens the student's own mail app with everything filled in. They still
  // press Send themselves; the app sends nothing.
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const note = document.getElementById("reportNote");
  if (note) note.textContent = "Your mail app should open with the report. Check it, then send.";
  announceScreenReader("Opening your mail app with the report. Check it, then send.");
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
  } else if (kind === "sample") {
    if (typeof gsPlaySample === "function") gsPlaySample(2.0, 0.05, "continuous", { visual: false, haptic: false });
    announceScreenReader("That is a sample warning time. It grows louder like a vehicle approaching, then stops.");
  } else if (kind === "signal") {
    playReferenceTick(0.05);
    announceScreenReader("That is the start signal.");
  } else {
    playUserMarkerTone(0.05);
    announceScreenReader("That is your own marker sound.");
  }
}

/* ============================================================
 * QUICK-START / DEMO MODE
 * ------------------------------------------------------------
 * A conference participant has about thirty seconds and is often using a
 * screen reader on a phone they are holding one-handed. Asking them to type
 * two numbers into Settings before anything works at all is far too much.
 *
 * So: example times can be loaded in one tap, and the link handed out at the
 * conference can carry "?demo=1" to do it automatically. The app then opens
 * straight into the practice screen, ready to use, with a clearly announced
 * note that the times are examples rather than the participant's own.
 * ============================================================ */

const GS_DEMO_KEY = "om-demo-times";
const GS_DEMO_CLEAR = "4.0";   // typical first-half time
const GS_DEMO_FULL = "8.0";    // typical full-street crossing
const GS_DEMO_MARGIN = "0.5";  // the value historically taught in workshops

function gsUsingDemoTimes() {
  return localStorage.getItem(GS_DEMO_KEY) === "true";
}

function gsLoadDemoTimes({ goToPractice = true } = {}) {
  setReferenceTimes(GS_DEMO_CLEAR, GS_DEMO_FULL, GS_DEMO_MARGIN, { source: "demo" });
  if (goToPractice) {
    gsShowScreen("practice");
    announceScreenReader(
      "Example times loaded. Press the big button to begin, then press it again when you think you would have reached the other side."
    );
  }
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

  document.getElementById("homeOpenSettingsBtn")?.addEventListener("click", () => {
    settingsTrigger.click();
  });

  const adaptiveToggle = document.getElementById("adaptiveMarginToggle");
  if (adaptiveToggle) {
    adaptiveToggle.checked = gsAdaptiveEnabled();
    adaptiveToggle.addEventListener("change", () => {
      gsSetAdaptiveEnabled(adaptiveToggle.checked);
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
      if (typeof renderPracticeScore === "function") renderPracticeScore();
      gsRenderProgress();
      announceScreenReader(
        adaptiveToggle.checked
          ? "Adaptive margin on. Experimental: each task's margin tightens slowly as accuracy improves and releases to the set margin when it drops."
          : "Adaptive margin off. The margin stays as set."
      );
    });
  }

  const resetLanes = document.getElementById("resetAdaptiveBtn");
  if (resetLanes) {
    resetLanes.addEventListener("click", () => {
      gsResetAdaptiveLanes();
      gsRenderProgress();
      announceScreenReader("Adaptive margins reset to the set margin.");
    });
  }

  document.getElementById("previewReportBtn")?.addEventListener("click", gsPreviewReport);
  document.getElementById("copyReportBtn")?.addEventListener("click", gsCopyReport);
  document.getElementById("emailReportBtn")?.addEventListener("click", gsEmailReport);
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

  // Times edited by hand in Settings are no longer the example values.
  [clearTimeInput, fullTimeInput].forEach((input) => {
    input?.addEventListener("change", () => {
      localStorage.removeItem(GS_DEMO_KEY);
      gsRenderHome();
    });
  });

  // Settings closing may have changed the margin or the instructor details.
  settingsModal?.addEventListener("close", () => {
    gsRenderHome();
    gsRenderReportControls();
    if (typeof renderPracticeScore === "function") renderPracticeScore();
    if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
    if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
  });
}

function gsBoot() {
  gsBindShell();
  gsComparisonInit();
  gsSignalInit();
  if (typeof renderPracticeScore === "function") renderPracticeScore();
  gsRenderReportControls();

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
