/* ============================================================
 * Gap Sense — shell: navigation, progress, sharing, help
 * ============================================================ */

const GS_SCREENS = ["home", "practice", "signal", "compare", "live", "progress", "help", "instructor", "shortcuts"];

/* The app name lives here and in index.html <title>/manifest only, so a
 * rename (under discussion) is a small change. */
const GS_APP_NAME = "Gap Sense";

const GS_SCREEN_TITLES = {
  home: GS_APP_NAME,
  practice: "Practice my timing",
  signal: "Comparison preparation",
  compare: "Comparison practice",
  live: "At the street",
  progress: "Progress",
  help: "Help",
  instructor: "Instructor setup",
  shortcuts: "Siri and shortcuts"
};

/* The four activities, in the order the skill is taught. Crossing times are
 * measured and set by the O&M Specialist (Instructor setup, or a link). */
const GS_STEP_ORDER = ["practice", "signal", "compare", "live"];

let gsCurrentScreen = "home";

/* Shown under Help → About so a tester can confirm which build they have.
 * Bump GS_APP_BUILD with CURRENT_PROJECT_VERSION (iOS), versionCode (Android)
 * and CACHE_VERSION (sw.js). In the native app the real bundle values are
 * read from the App plugin and override these. */
const GS_APP_VERSION = "1.0";
const GS_APP_BUILD = "11";
const GS_APP_DATE = "16 October 2026";

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
  el.textContent = `${GS_APP_NAME} version ${version}, build ${build} (${channel}), ${GS_APP_DATE}.`;
}

/*
 * Stop whatever any activity is doing. Called on every screen change so that
 * leaving mid-run never leaves timers firing, speech suppressed, Settings
 * locked, or a gesture pad open.
 */
function gsCancelActivities() {
  if (typeof cancelPractice === "function") cancelPractice();
  if (typeof gsCompareCancel === "function") gsCompareCancel();
  if (typeof gsLiveLeave === "function") gsLiveLeave();
  if (typeof gsSignalCancel === "function") gsSignalCancel();
  if (typeof gsClearHaptics === "function") gsClearHaptics();
  // Sounds already scheduled used to play on into the next screen for up to
  // the length of a replay; now Back silences them at once.
  if (typeof stopAllSound === "function") stopAllSound();
  if (typeof gsStopSpeech === "function") gsStopSpeech();
  suppressSrAnnouncements = false;
  stopVisualReplay();
  gsHideIntervalVisual();
}

/*
 * Each settings box is a labelled group: its heading (a real h2/h3 since
 * build 10) names the group, so VoiceOver reads "Crossing times, group" on
 * entering it and the headings rotor can jump between sections.
 */
function gsLabelSections() {
  let n = 0;
  document.querySelectorAll(".setup-heading, .card-label").forEach((heading) => {
    const group = heading.closest(".setup-group, .card, .help-card, .progress-section") || heading.parentElement;
    if (!group || group === document.body || group.tagName === "SECTION") return;
    if (!heading.id) heading.id = `gsSectionHeading${++n}`;
    if (!group.hasAttribute("role")) group.setAttribute("role", "group");
    if (!group.hasAttribute("aria-labelledby")) group.setAttribute("aria-labelledby", heading.id);
  });
}

/* What self-voicing says on arrival at each screen. */
function gsScreenIntro(name) {
  const intro = document.querySelector(`#screen-${name} .screen-intro`);
  return [GS_SCREEN_TITLES[name], intro ? intro.textContent.trim() : ""].filter(Boolean).join(". ");
}

function gsShowScreen(name) {
  if (!GS_SCREENS.includes(name)) name = "home";
  // An activity the instructor turned off cannot be opened by a link or a
  // shortcut either.
  if (GS_STEP_ORDER.includes(name) && typeof gsActivityEnabled === "function" && !gsActivityEnabled(name)) {
    name = "home";
  }
  const leaving = gsCurrentScreen;
  gsCancelActivities();
  if (leaving === "instructor" && name !== "instructor" && typeof gsInstructorLeave === "function") gsInstructorLeave();
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
  if (name === "instructor") {
    if (typeof gsRenderInstructorFeatures === "function") gsRenderInstructorFeatures();
    if (typeof gsRenderInstructorLock === "function") gsRenderInstructorLock();
  }
  if (name === "shortcuts") gsRenderShortcuts();
  gsRenderSafetyNotes();

  // Focus the one visible heading, so a screen reader announces where the
  // student has arrived and the next swipe reaches the first control.
  if (title) title.focus({ preventScroll: true });
  window.scrollTo(0, 0);

  if (a11ySettings.selfVoice && name !== "home") gsSpeak(gsScreenIntro(name));
}

/* ============================================================
 * Visual channel for intervals
 * ------------------------------------------------------------
 * The replay overlay is driven by the AudioContext clock and owned by the
 * practice engine. Playing a sample, or showing a right/wrong result, needs
 * something simpler: hold a visual on screen for exactly as long as it lasts.
 *   type "sample"                 the sample warning time: a held bar
 *   type "user"                   the student's flash
 *   type "acceptable" / "outside" the circle / the triangle
 * ============================================================ */

let gsIntervalVisualTimers = [];

function gsHideIntervalVisual() {
  gsIntervalVisualTimers.forEach((id) => clearTimeout(id));
  gsIntervalVisualTimers = [];
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  const sample = document.getElementById("visualReplaySample");
  if (!overlay) return;
  overlay.dataset.active = "false";
  if (flash) flash.style.background = "transparent";
  if (shape) shape.style.display = "none";
  if (sample) sample.style.display = "none";
}

function gsShowIntervalVisual(startDelaySec, durationSec, type = "user") {
  if (!visualOutputEnabled()) return;
  const overlay = document.getElementById("visualReplayOverlay");
  const flash = document.getElementById("visualReplayFlash");
  const shape = document.getElementById("visualReplayShape");
  const sample = document.getElementById("visualReplaySample");
  if (!overlay || !flash || !shape) return;

  gsIntervalVisualTimers.push(setTimeout(() => {
    overlay.dataset.active = "true";
    flash.style.background = "#000000";
    shape.style.display = "none";
    if (sample) sample.style.display = "none";
    if (type === "user") {
      flash.style.background = getUserFlashColor();
    } else if (type === "sample") {
      if (sample) sample.style.display = "block";
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
  // until the times exist. Activities the instructor turned off are hidden.
  let shown = 0;
  GS_STEP_ORDER.forEach((step) => {
    const card = document.querySelector(`.step-card[data-screen="${step}"]`);
    if (!card) return;
    const enabled = typeof gsActivityEnabled !== "function" || gsActivityEnabled(step);
    card.hidden = !enabled;
    if (enabled) shown += 1;
    card.classList.toggle("locked", !ready);
    const btn = card.querySelector("button");
    if (btn) {
      btn.disabled = !ready;
      btn.setAttribute("aria-disabled", String(!ready));
    }
  });
  const none = document.getElementById("homeNoActivities");
  if (none) none.hidden = shown > 0;

  // Number the visible activities 1, 2, 3… so a hidden one leaves no gap.
  let number = 0;
  document.querySelectorAll(".step-card").forEach((card) => {
    if (card.hidden) return;
    number += 1;
    const badge = card.querySelector(".step-number");
    if (badge) badge.textContent = String(number);
  });

  const summary = gsSummary();
  const el = document.getElementById("homeProgressNote");
  if (el) {
    el.textContent = summary.total
      ? `${summary.total} attempts over ${summary.daysPracticed} day${summary.daysPracticed === 1 ? "" : "s"}`
      : "No practice recorded yet";
  }

  gsRenderDemoNote();

  // The numbers themselves stay in Instructor setup. A student who reads
  // "8.0 s" on the home screen is invited to count, which is the one thing
  // the method forbids.
  const times = document.getElementById("homeTimes");
  if (times) {
    times.textContent = ready
      ? (gsUsingDemoTimes() ? "Using example crossing times" : "Crossing times set")
      : "Crossing times not set";
  }
}

/* ============================================================
 * Safety notes: "longer does not mean long enough"
 * ------------------------------------------------------------
 * Cindi: make it very clear, on At the street and Comparison practice, that
 * a longer warning time is not by itself long enough. Shown until the
 * student dismisses it; Help can bring it back.
 * ============================================================ */

function gsSafetyKey(name) {
  return `om-safety-dismissed-${name}`;
}

function gsRenderSafetyNotes() {
  document.querySelectorAll("[data-safety-note]").forEach((note) => {
    note.hidden = localStorage.getItem(gsSafetyKey(note.dataset.safetyNote)) === "true";
  });
}

function gsBindSafetyNotes() {
  document.querySelectorAll("[data-dismiss-safety]").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem(gsSafetyKey(btn.dataset.dismissSafety), "true");
      gsRenderSafetyNotes();
      announceScreenReader("Note hidden. You can show it again from Help.");
      document.getElementById("screenTitle")?.focus({ preventScroll: true });
    });
  });
  document.getElementById("showSafetyNotesBtn")?.addEventListener("click", () => {
    ["compare", "live"].forEach((name) => localStorage.removeItem(gsSafetyKey(name)));
    localStorage.removeItem(GS_DISCLAIMER_KEY);
    gsRenderSafetyNotes();
    gsShowDisclaimer({ thenTutorial: false });
  });
}

/* ============================================================
 * First run: use with an O&M Specialist
 * ============================================================ */

const GS_DISCLAIMER_KEY = "om-disclaimer-ack";

function gsShowDisclaimer({ thenTutorial = false } = {}) {
  const dialog = document.getElementById("disclaimerModal");
  if (!dialog || typeof dialog.showModal !== "function") return;
  dialog.dataset.thenTutorial = String(thenTutorial);
  if (!dialog.open) {
    lockPageScroll();
    setMainContentInert(true);
    dialog.showModal();
  }
  document.getElementById("disclaimerTitle")?.focus();
  if (a11ySettings.selfVoice) {
    gsSpeak([...dialog.querySelectorAll(".disclaimer-text")].map((p) => p.textContent).join(" "));
  }
}

function gsBindDisclaimer() {
  const dialog = document.getElementById("disclaimerModal");
  if (!dialog) return;
  // Escape must not skip it.
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  document.getElementById("disclaimerAcceptBtn")?.addEventListener("click", () => {
    localStorage.setItem(GS_DISCLAIMER_KEY, "true");
    const thenTutorial = dialog.dataset.thenTutorial === "true";
    dialog.close();
    if (thenTutorial && !localStorage.getItem(GS_TUTORIAL_KEY)) {
      setTimeout(() => gsRunTutorial(), 250);
    } else if (typeof offerOpenInApp === "function") {
      offerOpenInApp();
    }
  });
  dialog.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
      document.getElementById("screenTitle")?.focus({ preventScroll: true });
    }
  });

  const openInApp = document.getElementById("openInAppModal");
  document.getElementById("openInAppClose")?.addEventListener("click", () => openInApp?.close());
  document.getElementById("openInAppLink")?.addEventListener("click", () => {
    setTimeout(() => openInApp?.close(), 300);
  });
  openInApp?.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
    }
  });
}

function gsAnyDialogOpen() {
  return [...document.querySelectorAll("dialog")].some((d) => d.open);
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
    const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
    const noun = activity === "practice" || activity === "signal" ? "within margin" : "correct";
    // "How much" estimates are the same vehicles or samples judged a second
    // way, so they get their own note and are never added to the count.
    const howMuch = stats.howMuchTotal
      ? ` · how much: ${stats.howMuchCorrect} of ${stats.howMuchTotal} within margin`
      : "";
    const main = stats.total ? `${stats.correct} of ${stats.total} ${noun}` : "no judgments yet";
    const skipped = stats.skipped ? ` · ${stats.skipped} skipped` : "";
    return `<div class="progress-card"><span class="progress-label">${label}</span>
      <span class="progress-value">${pct === null ? "—" : `${pct}%`}</span>
      <span class="progress-note">${main}${howMuch}${skipped}</span></div>`;
  }).join("");

  // A small run of the last 20 timing attempts (practice and preparation).
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
 * Sending a report to the instructor
 * ------------------------------------------------------------
 * Cindi: copy and paste, especially with VoiceOver, is beyond students with
 * emerging technology skills, and not everyone has Mail set up. So: one
 * button shows the report and asks to confirm; "Send it" opens the phone's
 * share sheet (Messages, Mail, WhatsApp, anything). Nothing is sent by the
 * app itself and nothing passes through any server. Identity is the short
 * student code, never a name.
 * ============================================================ */

function gsReportText() {
  return gsBuildReport({ clientCode: typeof getClientCode === "function" ? getClientCode() : "" });
}

function gsReportSubject() {
  const code = typeof getClientCode === "function" ? getClientCode() : "";
  return `${GS_APP_NAME} practice report${code ? ` — ${code}` : ""}`;
}

function gsRenderReportControls() {
  const email = typeof getInstructorEmail === "function" ? getInstructorEmail() : "";
  const emailBtn = document.getElementById("emailReportBtn");
  if (emailBtn) emailBtn.hidden = !email;
  const whom = document.getElementById("reportRecipient");
  if (whom) {
    whom.textContent = email ? `Your instructor's email: ${email}` : "";
    whom.hidden = !email;
  }
}

function gsPreviewReport() {
  const box = document.getElementById("reportPreview");
  const wrap = document.getElementById("reportPreviewWrap");
  if (!box || !wrap) return;
  box.value = gsReportText();
  wrap.hidden = false;
  gsRenderReportControls();
  const note = document.getElementById("reportNote");
  if (note) note.textContent = "";
  announceScreenReader("Here is the report. Nothing has been sent. Press Send it to choose how to send it.");
  document.getElementById("confirmSendReportBtn")?.focus({ preventScroll: true });
}

function gsCloseReport() {
  const wrap = document.getElementById("reportPreviewWrap");
  if (wrap) wrap.hidden = true;
  document.getElementById("sendReportBtn")?.focus({ preventScroll: true });
}

async function gsConfirmSendReport() {
  const box = document.getElementById("reportPreview");
  if (!box?.value) gsPreviewReport();
  const note = document.getElementById("reportNote");
  const outcome = await gsShareText({ title: gsReportSubject(), text: document.getElementById("reportPreview").value });
  const messages = {
    shared: "Report handed to the app you chose. Check it there, then send.",
    copied: "Your device cannot open a share menu here, so the report was copied. Paste it into a message or email.",
    cancelled: "Not sent."
  };
  if (note) note.textContent = messages[outcome];
  announceScreenReader(messages[outcome]);
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
  // Opens the student's own mail app with everything filled in. They still
  // press Send themselves; the app sends nothing.
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(gsReportSubject())}&body=${encodeURIComponent(body)}`;
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
 * Siri and shortcuts
 * ============================================================ */

function gsRenderShortcuts() {
  const native = Boolean(window.Capacitor?.isNativePlatform?.());
  const platform = native ? (window.Capacitor.getPlatform?.() || "") : "web";
  const ios = document.getElementById("shortcutsIos");
  const android = document.getElementById("shortcutsAndroid");
  const web = document.getElementById("shortcutsWeb");
  if (ios) ios.hidden = platform !== "ios";
  if (android) android.hidden = platform !== "android";
  if (web) web.hidden = native;
}

/*
 * Siri and app shortcuts arrive two ways: as a gapsense://open/<screen> URL
 * (Android shortcuts, and the Shortcuts app's "Open URL"), handled in
 * engine.js, or from the iOS App Shortcuts through the GSNative plugin.
 */
function gsBindNativeShortcuts() {
  const plugin = window.Capacitor?.Plugins?.GSNative;
  if (!plugin) return;
  try {
    plugin.addListener?.("openScreen", (event) => {
      if (event?.screen) gsShowScreen(event.screen);
    });
    const pending = plugin.pendingScreen?.();
    if (pending && typeof pending.then === "function") {
      pending.then((result) => {
        if (result?.screen) gsShowScreen(result.screen);
      }).catch(() => {});
    }
  } catch (error) {
    /* non-fatal */
  }
}

/* ============================================================
 * Sound tutorial
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
    announceScreenReader("That is a sample warning time. One steady sound, then it stops.");
  } else if (kind === "ready") {
    hapticCue("ready");
    if (!gsSpeak("Get ready")) announceScreenReader("Get ready.");
  } else {
    playUserMarkerTone(0.05);
    announceScreenReader("That is your own sound.");
  }
}

/* ============================================================
 * QUICK-START / DEMO MODE
 * ------------------------------------------------------------
 * A conference participant has about thirty seconds and is often using a
 * screen reader on a phone they are holding one-handed. Example times can be
 * loaded in one tap, and the conference link carries "?demo=1" to do it
 * automatically.
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
    gsShowScreen(typeof gsActivityEnabled === "function" && !gsActivityEnabled("practice") ? "home" : "practice");
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

  document.getElementById("homeOpenSettingsBtn")?.addEventListener("click", () => gsShowScreen("instructor"));
  document.getElementById("openInstructorSetupBtn")?.addEventListener("click", () => {
    // The dialog's close handler returns focus to whatever opened it; send it
    // to the new screen's heading instead.
    lastDialogTrigger = document.getElementById("screenTitle");
    settingsModal.close();
    gsShowScreen("instructor");
  });

  const adaptiveToggle = document.getElementById("adaptiveMarginToggle");
  if (adaptiveToggle) {
    adaptiveToggle.checked = gsAdaptiveEnabled();
    adaptiveToggle.addEventListener("change", () => {
      gsSetAdaptiveEnabled(adaptiveToggle.checked);
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
      if (typeof renderPracticeScore === "function") renderPracticeScore();
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
      announceScreenReader("Adaptive margins reset to the set margin.");
    });
  }

  document.getElementById("sendReportBtn")?.addEventListener("click", gsPreviewReport);
  document.getElementById("confirmSendReportBtn")?.addEventListener("click", gsConfirmSendReport);
  document.getElementById("cancelSendReportBtn")?.addEventListener("click", gsCloseReport);
  document.getElementById("copyReportBtn")?.addEventListener("click", gsCopyReport);
  document.getElementById("emailReportBtn")?.addEventListener("click", gsEmailReport);
  document.getElementById("clearDataBtn")?.addEventListener("click", gsClearData);

  document.getElementById("openTutorialBtn")?.addEventListener("click", gsRunTutorial);
  document.getElementById("closeTutorial")?.addEventListener("click", () => {
    document.getElementById("tutorialModal")?.close();
  });
  document.getElementById("tutorialModal")?.addEventListener("close", () => {
    if (!gsAnyDialogOpen()) {
      unlockPageScroll();
      setMainContentInert(false);
    }
    if (typeof offerOpenInApp === "function") offerOpenInApp();
  });
  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", () => gsTutorialDemo(btn.dataset.demo));
  });

  document.getElementById("tryDemoBtn")?.addEventListener("click", () => gsLoadDemoTimes());

  document.getElementById("openShortcutsAppBtn")?.addEventListener("click", () => {
    window.location.href = "shortcuts://";
  });

  // Times edited by hand are no longer the example values.
  [clearTimeInput, fullTimeInput].forEach((input) => {
    input?.addEventListener("change", () => {
      localStorage.removeItem(GS_DEMO_KEY);
      gsRenderHome();
    });
  });
  // Instructor details may have changed.
  [instructorEmailInput, clientCodeInput, marginInput].forEach((input) => {
    input?.addEventListener("change", () => {
      gsRenderReportControls();
      if (typeof renderPracticeScore === "function") renderPracticeScore();
      if (typeof gsCompareRenderScore === "function") gsCompareRenderScore();
      if (typeof gsSignalRenderScore === "function") gsSignalRenderScore();
    });
  });

  settingsModal?.addEventListener("close", () => {
    gsRenderHome();
    gsRenderReportControls();
  });

  gsBindSafetyNotes();
  gsBindDisclaimer();
}

function gsBoot() {
  gsLabelSections();
  gsBindShell();
  if (typeof gsFeaturesInit === "function") gsFeaturesInit();
  gsComparisonInit();
  gsSignalInit();
  if (typeof renderPracticeScore === "function") renderPracticeScore();
  gsRenderReportControls();
  gsBindNativeShortcuts();

  // ?demo=1 — the conference link. Straight in, nothing to set up.
  const params = new URLSearchParams(window.location.search);
  const wantsDemo = params.get("demo") === "1";
  const needsDisclaimer = !localStorage.getItem(GS_DISCLAIMER_KEY);

  if (wantsDemo) {
    localStorage.setItem(GS_TUTORIAL_KEY, "true"); // no tutorial in the way
    if (!gsHasTimes() || gsUsingDemoTimes()) {
      gsLoadDemoTimes();
    } else {
      gsShowScreen("practice");
    }
    gsRenderDemoNote();
    // The O&M guidance is shown on first run even from the conference link.
    if (needsDisclaimer) setTimeout(() => gsShowDisclaimer({ thenTutorial: false }), 300);
    return;
  }

  gsShowScreen("home");
  gsRenderDemoNote();

  if (needsDisclaimer) {
    // Let the first paint settle before taking over the screen.
    setTimeout(() => gsShowDisclaimer({ thenTutorial: true }), 500);
  } else if (!localStorage.getItem(GS_TUTORIAL_KEY)) {
    setTimeout(() => gsRunTutorial(), 700);
  } else if (typeof offerOpenInApp === "function") {
    offerOpenInApp();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", gsBoot);
} else {
  gsBoot();
}
