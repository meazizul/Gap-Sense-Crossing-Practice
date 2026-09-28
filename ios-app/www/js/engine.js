    /* ============================================================
     * LocalStorage keys (all prefixed om-):
     *   om-clear-time, om-full-time, om-margin, om-mode,
     *   om-replay-use-confirm, om-debug-replay,
     *   om-feedback-acceptable, om-feedback-outside,
     *   om-a11y-output-mode, om-a11y-show-banner, om-a11y-flash-action,
     *   om-a11y-vibrate, om-a11y-use-text-labels, om-a11y-theme,
     *   om-a11y-text-size, om-a11y-high-contrast, om-a11y-focus-boost,
     *   om-a11y-announce-cues, om-a11y-sync-visual-replay,
     *   om-a11y-outside-visual-variant, om-a11y-user-flash-contrast
     * Cue types: start, marker, replay_start, replay_end,
     *            validation_error, reference_ok, reference_bad
     * ============================================================ */

    const appMain = document.getElementById("appMain");
    const actionBtn = document.getElementById("actionBtn");
    const actionBtnLabel = actionBtn.querySelector(".action-btn-label");
    const actionBtnIndicator = document.getElementById("actionBtnIndicator");
    const actionBtnHint = document.getElementById("actionBtnHint");
    const markersEl = document.getElementById("markers");
    const debugText = document.getElementById("debugText");
    const modeInputs = [...document.querySelectorAll("input[name='mode']")];
    const timingRequiredPrompt = document.getElementById("timingRequiredPrompt");
    const timingRequiredPromptText = document.getElementById("timingRequiredPromptText");
    const timingRequiredPromptButton = document.getElementById("timingRequiredPromptButton");
    const settingsTrigger = document.getElementById("settingsTrigger");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettings = document.getElementById("closeSettings");
    const a11yTrigger = document.getElementById("a11yTrigger");
    const a11yModal = document.getElementById("a11yModal");
    const closeA11y = document.getElementById("closeA11y");
    const settingsTitle = document.getElementById("settingsTitle");
    const a11yTitle = document.getElementById("a11yTitle");
    const cueBanner = document.getElementById("cueBanner");
    const cueBannerText = document.getElementById("cueBannerText");
    const srAnnouncer = document.getElementById("srAnnouncer");
    const outputModeInputs = [...document.querySelectorAll("input[name='a11yOutputMode']")];
    const a11yShowBanner = document.getElementById("a11yShowBanner");
    const a11yFlashAction = document.getElementById("a11yFlashAction");
    const a11yVibrate = document.getElementById("a11yVibrate");
    const a11yUseTextLabels = document.getElementById("a11yUseTextLabels");
    const a11ySyncVisualReplay = document.getElementById("a11ySyncVisualReplay");
    const a11yTheme = document.getElementById("a11yTheme");
    const a11yTextSize = document.getElementById("a11yTextSize");
    const textSizeLandscapeHint = document.getElementById("textSizeLandscapeHint");
    const a11yHighContrast = document.getElementById("a11yHighContrast");
    const a11yFocusBoost = document.getElementById("a11yFocusBoost");
    const a11yAnnounceCues = document.getElementById("a11yAnnounceCues");
    const hapticsTestBtn = document.getElementById("hapticsTestBtn");
    const hapticsSupportNote = document.getElementById("hapticsSupportNote");
    const previewUserSoundBtn = document.getElementById("previewUserSound");
    const replayUsesConfirm = document.getElementById("replayUsesConfirm");
    const debugToggle = document.getElementById("debugToggle");
    const shareTimingSettingsBtn = document.getElementById("shareTimingSettings");
    const setupTimingMessage = document.getElementById("setupTimingMessage");
    const practiceTimingMessage = document.getElementById("practiceTimingMessage");
    const copySetupTimingMessageBtn = document.getElementById("copySetupTimingMessage");
    const copyPracticeTimingMessageBtn = document.getElementById("copyPracticeTimingMessage");
    const clearTimeInput = document.getElementById("clearTime");
    const fullTimeInput = document.getElementById("fullTime");
    const marginInput = document.getElementById("marginInput");
    const numberInputs = [...document.querySelectorAll("input[type='number']")];
    const acceptableInputs = [...document.querySelectorAll("input[name='acceptableSound']")];
    const outsideInputs = [...document.querySelectorAll("input[name='outsideSound']")];
    const previewButtons = [...document.querySelectorAll(".preview-btn")];
    const exemplarButtons = [...document.querySelectorAll(".exemplar-btn")];
    const visualPreviewButtons = [...document.querySelectorAll(".visual-preview-btn")];
    const outsideVisualVariantInputs = [...document.querySelectorAll("input[name='outsideVisualVariant']")];
    const userFlashContrastInputs = [...document.querySelectorAll("input[name='userFlashContrast']")];
    const visualReplayOverlay = document.getElementById("visualReplayOverlay");
    const visualReplayFlash = document.getElementById("visualReplayFlash");
    const visualReplayShape = document.getElementById("visualReplayShape");
    const settingsVisualPreview = document.getElementById("settingsVisualPreview");
    const settingsVisualPreviewFlash = document.getElementById("settingsVisualPreviewFlash");
    const settingsVisualPreviewShape = document.getElementById("settingsVisualPreviewShape");

    const setupControls = [
      settingsTrigger,
      previewUserSoundBtn,
      clearTimeInput,
      fullTimeInput,
      marginInput,
      replayUsesConfirm,
      debugToggle,
      shareTimingSettingsBtn,
      copySetupTimingMessageBtn,
      copyPracticeTimingMessageBtn,
      ...acceptableInputs,
      ...outsideInputs,
      ...previewButtons,
      ...visualPreviewButtons,
      ...outsideVisualVariantInputs,
      ...userFlashContrastInputs,
      ...exemplarButtons
    ];

    const a11yControls = [
      a11yTrigger,
      a11yShowBanner,
      a11yFlashAction,
      a11yVibrate,
      a11yUseTextLabels,
      a11ySyncVisualReplay,
      a11yTheme,
      a11yTextSize,
      a11yHighContrast,
      a11yFocusBoost,
      a11yAnnounceCues,
      hapticsTestBtn,
      ...outputModeInputs
    ];

    const modes = {
      "2": { labels: ["Start", "Finish"] },
      "2b": { labels: ["Start", "Halfway"] },
      "3": { labels: ["Start", "Halfway", "Finish"] }
    };

    let audioContext;
    let masterLimiter;
    let markerTimes = [];
    let currentMode = "2b";
    let stage = 0;
    let started = false;
    let replayTimeout;
    let exemplarTimeout;
    let exemplarVisualTimeouts = [];
    let replayUsesConfirmTone = false;
    let showDebug = false;
    let suppressSrAnnouncements = false;
    let pendingStatusMessage = "";
    let lastDialogTrigger = null;
    let lockedScrollY = 0;
    let flashTimeout;
    let startTimestamp = 0;

    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const VISUAL_PULSE_SEC = 0.2;
    const VISUAL_REPLAY_PRE_DELAY_SEC = 0.5; // screen stays normal this long before going black
    const VISUAL_USER_FLASH_COLORS = {
      soft: "#8c8c8c",
      balanced: "#bcbcbc",
      high: "#e6e6e6"
    };

    const visualReplayState = {
      rafId: null,
      nextIndex: 0,
      events: [],
      endAtSec: 0,
      replayStartTime: 0,
      userFlashUntilSec: 0,
      referenceUntilSec: 0,
      currentReferenceType: null,
      target: null
    };

    const a11ySettings = {
      outputMode: "audio-only",
      showBanner: true,
      flashAction: false,
      vibrate: false,
      useTextLabels: true,
      syncVisualReplay: true,
      outsideVisualVariant: "up",
      userFlashContrast: "soft",
      theme: "system",
      textSize: "default",
      highContrast: false,
      focusBoost: false,
      announceCues: true
    };

    /* ============================================================
     * NATIVE HAPTICS BRIDGE
     * navigator.vibrate() does not exist in Safari/WKWebView on iOS —
     * Apple has never implemented the Vibration API. Inside the
     * Capacitor shell we reach the real Taptic Engine instead; on the
     * web we fall back to navigator.vibrate (Android) and degrade to
     * nothing on iOS Safari.
     * ============================================================ */
    const CapacitorGlobal = window.Capacitor;
    const isNativeShell = Boolean(CapacitorGlobal?.isNativePlatform?.());
    const HapticsPlugin = CapacitorGlobal?.Plugins?.Haptics;
    const hasWebVibrate = typeof navigator.vibrate === "function";

    const WEB_VIBRATION_PATTERNS = {
      start: [25],
      marker: [40],
      reference_ok: [30, 30, 30],
      reference_bad: [120]
    };

    function hapticsAvailable() {
      return (isNativeShell && Boolean(HapticsPlugin)) || hasWebVibrate;
    }

    function describeHapticsSupport() {
      if (isNativeShell && HapticsPlugin) {
        return "Native haptics active — this build drives the iPhone Taptic Engine directly.";
      }
      if (hasWebVibrate) {
        return "Web vibration available. Patterns are coarse on/off only (typical on Android browsers).";
      }
      return "No haptics on this browser. iOS Safari has never supported web vibration — install the native app build to feel cues.";
    }

    function hapticCue(type) {
      if (!a11ySettings.vibrate) return;
      if (isNativeShell && HapticsPlugin) {
        try {
          if (type === "reference_ok") {
            HapticsPlugin.notification({ type: "SUCCESS" });
          } else if (type === "reference_bad") {
            HapticsPlugin.notification({ type: "ERROR" });
          } else if (type === "marker") {
            HapticsPlugin.impact({ style: "MEDIUM" });
          } else if (type === "start") {
            HapticsPlugin.impact({ style: "LIGHT" });
          }
          return;
        } catch (error) {
          /* fall through to the web path */
        }
      }
      if (hasWebVibrate) {
        const pattern = WEB_VIBRATION_PATTERNS[type];
        if (pattern) navigator.vibrate(pattern);
      }
    }

    /* ---------------- Layout / viewport ---------------- */
    function lockPageScroll() {
      lockedScrollY = window.scrollY;
      document.body.classList.add("dialog-open");
      document.body.style.top = `-${lockedScrollY}px`;
    }

    function unlockPageScroll() {
      document.body.classList.remove("dialog-open");
      document.body.style.top = "";
      window.scrollTo(0, lockedScrollY);
    }

    function syncViewportHeight() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--viewport-height", `${viewportHeight}px`);
      applyLayoutMode();
    }

    function setMainContentInert(isInert) {
      appMain.inert = isInert;
      if (isInert) {
        appMain.setAttribute("aria-hidden", "true");
        return;
      }
      appMain.removeAttribute("aria-hidden");
    }

    function applyLayoutMode() {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const coarsePointer = window.matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0;
      const largeTextLayout = ["largest", "huge", "xl", "xxl", "max"].includes(a11ySettings.textSize);
      const phoneSafeLayout = coarsePointer || viewportWidth <= 430 || viewportHeight <= 500 || largeTextLayout;
      document.body.classList.toggle("phone-safe-layout", phoneSafeLayout);
      document.body.classList.toggle("short-screen-layout", viewportHeight <= 500);
      document.body.classList.toggle("large-text-layout", largeTextLayout);
      document.body.classList.toggle("landscape-layout", viewportWidth > viewportHeight);
    }

    function syncCueBannerVisibility() {
      const hasMessage = Boolean(cueBannerText.textContent.trim());
      cueBanner.dataset.visible = String(a11ySettings.showBanner && hasMessage);
    }

    /* ---------------- Audio ---------------- */
    const tones = {
      confirm: { base: 350, harmonic: 700 },
      user: { base: 410 }
    };

    /*
     * ============================================================
     * SOUND / TIMING TUNING GUIDE (edit here, no code changes needed)
     * ============================================================
     *
     * 1) TEST_TUNING: timing and loudness controls
     * ------------------------------------------------------------
     * replayLeadInSec    delay before replay starts. Typical 0.4-1.2 s.
     * exemplarLeadInSec  delay before exemplar playback. Typical 0.3-0.8 s.
     * replayEndPadSec /
     * exemplarEndPadSec  extra time after the final cue before reset.
     *                    Typical 0.8-1.5 s.
     *
     * masterVolume       scales all sounds. Typical 0.7-1.0.
     * userVolume         scales the user marker tone. Typical 0.8-1.0.
     * feedbackVolume     scales acceptable/outside cues. Typical 0.8-1.0.
     * confirmVolume      scales the button chime. Typical 0.6-1.0 — keep
     *                    below feedbackVolume so the cues stand out.
     *
     * Presets are normalized so 1 plays at (near) full scale. Values above
     * 1 hit the master limiter: no distortion, but no extra loudness
     * either. Stay at or below 1.
     *
     * visualPreviewTimingMs  Settings-preview timing for the visual samples.
     *                    enter/visible/exit in ms. Typical 250-600.
     *
     * 2) SOUND_PRESET_LIBRARY: named tone families
     * ------------------------------------------------------------
     * Each preset has a duration (seconds, before the release tail) and
     * partials (freq + gain layers that shape the timbre).
     * Easiest path for non-musicians:
     *   A) pick a different preset name in SOUND_FALLBACK_TONES
     *   B) then tweak gainScale / durationScale in presetTone(...)
     *
     * 3) SOUND_FALLBACK_TONES: assign presets to roles
     * ------------------------------------------------------------
     * acceptable-a / acceptable-b   within-margin feedback options
     * outside-a / outside-b         outside-margin feedback options
     * user-marker                   replay marker tone (default)
     * user-confirm                  optional replay alternative
     *
     * 4) presetTone(...) options
     * ------------------------------------------------------------
     * transposeSemitones  pitch shift; +12 = one octave up. Typical -3..+3.
     * gainScale           multiplier for partial gains. Typical 0.8-1.3.
     * durationScale       multiplier for duration. Typical 0.8-1.4.
     */
    const TEST_TUNING = {
      replayLeadInSec: 1.5,
      exemplarLeadInSec: 0.5,
      replayEndPadSec: 1.2,
      exemplarEndPadSec: 0.9,
      masterVolume: 1,
      userVolume: 1,
      feedbackVolume: 1,
      confirmVolume: 0.8,
      visualPreviewTimingMs: {
        userEnter: 500,
        userVisible: 280,
        userExit: 500,
        shapeEnter: 500,
        shapeVisible: 280,
        shapeExit: 500
      }
    };

    // Gain budget: keep the SUM of a preset's partial gains at or below ~0.8.
    // That leaves headroom for a user marker and a feedback cue landing at the
    // same moment during replay (the accurate case); the master limiter
    // catches anything beyond it.
    const SOUND_PRESET_LIBRARY = {
      // "Acceptable" cues: short, pure, high two-note chimes.
      chime_soft: {
        duration: 0.12,
        partials: [{ freq: 659, gain: 0.55 }, { freq: 823, gain: 0.25 }]
      },
      chime_bright: {
        duration: 0.12,
        partials: [{ freq: 523, gain: 0.55 }, { freq: 659, gain: 0.25 }]
      },
      // "Outside" cues: longer, rough, buzzing pulses. Two closely spaced
      // frequencies beat against each other (harsh texture), pitched near
      // ~300-350 Hz — dark next to the chimes, but high enough for a phone
      // speaker to actually reproduce (240-260 Hz fell below small-speaker
      // response and was partly lost in the speaker itself).
      pulse_low: {
        duration: 0.3,
        partials: [{ freq: 330, gain: 0.42 }, { freq: 349, gain: 0.38 }]
      },
      pulse_dull: {
        duration: 0.3,
        partials: [{ freq: 294, gain: 0.42 }, { freq: 311, gain: 0.38 }]
      },
      marker_tone: {
        duration: 0.14,
        partials: [{ freq: tones.user.base, gain: 0.75 }]
      },
      confirm_chime: {
        duration: 0.18,
        partials: [{ freq: tones.confirm.base, gain: 0.5 }, { freq: tones.confirm.harmonic, gain: 0.22 }]
      }
    };

    function presetTone(name, options = {}) {
      const base = SOUND_PRESET_LIBRARY[name] || SOUND_PRESET_LIBRARY.marker_tone;
      const transposeSemitones = Number(options.transposeSemitones || 0);
      const transpose = Math.pow(2, transposeSemitones / 12);
      const gainScale = Number(options.gainScale || 1);
      const durationScale = Number(options.durationScale || 1);
      return {
        duration: base.duration * durationScale,
        partials: base.partials.map((partial) => ({
          freq: partial.freq * transpose,
          gain: partial.gain * gainScale
        }))
      };
    }

    const SOUND_FALLBACK_TONES = {
      "acceptable-a": presetTone("chime_soft"),
      "acceptable-b": presetTone("chime_bright"),
      "outside-a": presetTone("pulse_low"),
      "outside-b": presetTone("pulse_dull"),
      "user-marker": presetTone("marker_tone"),
      "user-confirm": presetTone("confirm_chime")
    };

    const feedbackOptions = {
      acceptable: {
        "acceptable-a": {
          label: "Chime A",
          duration: SOUND_FALLBACK_TONES["acceptable-a"].duration,
          partials: SOUND_FALLBACK_TONES["acceptable-a"].partials
        },
        "acceptable-b": {
          label: "Chime B",
          duration: SOUND_FALLBACK_TONES["acceptable-b"].duration,
          partials: SOUND_FALLBACK_TONES["acceptable-b"].partials
        }
      },
      outside: {
        "outside-a": {
          label: "Low Pulse A",
          duration: SOUND_FALLBACK_TONES["outside-a"].duration,
          partials: SOUND_FALLBACK_TONES["outside-a"].partials
        },
        "outside-b": {
          label: "Low Pulse B",
          duration: SOUND_FALLBACK_TONES["outside-b"].duration,
          partials: SOUND_FALLBACK_TONES["outside-b"].partials
        }
      }
    };

    const userSoundOptions = {
      marker: {
        duration: SOUND_FALLBACK_TONES["user-marker"].duration,
        partials: SOUND_FALLBACK_TONES["user-marker"].partials
      },
      confirm: {
        duration: SOUND_FALLBACK_TONES["user-confirm"].duration,
        partials: SOUND_FALLBACK_TONES["user-confirm"].partials
      }
    };

    function ensureAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Safety limiter on the master output: individual cues are tuned to
        // pass through untouched, but overlapping cues (user marker + feedback
        // tone landing together during replay) are caught here instead of
        // hard-clipping into distortion.
        masterLimiter = audioContext.createDynamicsCompressor();
        masterLimiter.threshold.value = -2;
        masterLimiter.knee.value = 0;
        masterLimiter.ratio.value = 20;
        masterLimiter.attack.value = 0.001;
        masterLimiter.release.value = 0.05;
        masterLimiter.connect(audioContext.destination);
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      return audioContext;
    }

    function playCompositeTone(partials, duration = 0.16, startTime = 0, volumeScale = 1) {
      if (a11ySettings.outputMode === "visual-only") return;
      const context = ensureAudioContext();
      if (context.state === "suspended") {
        context.resume().then(() => {
          playCompositeTone(partials, duration, startTime, volumeScale);
        });
        return;
      }
      const now = context.currentTime + startTime;
      const gain = context.createGain();
      const attack = 0.01;
      const release = 0.07;
      const outputLevel = TEST_TUNING.masterVolume * volumeScale;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(outputLevel, now + attack);
      gain.gain.linearRampToValueAtTime(0, now + duration + release);
      partials.forEach((partial) => {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.value = partial.freq;
        const oscGain = context.createGain();
        oscGain.gain.setValueAtTime(partial.gain, now);
        osc.connect(oscGain).connect(gain);
        osc.start(now);
        osc.stop(now + duration + release + 0.02);
      });
      gain.connect(masterLimiter);
    }

    function playSoundOption(option, startTime = 0, volumeScale = 1) {
      if (!option) return;
      playCompositeTone(option.partials, option.duration || 0.12, startTime, volumeScale);
    }

    function playConfirmTone(startTime = 0) {
      playSoundOption(userSoundOptions.confirm, startTime, TEST_TUNING.confirmVolume);
    }

    function playUserMarkerTone(startTime = 0) {
      playSoundOption(userSoundOptions.marker, startTime, TEST_TUNING.userVolume);
    }

    function playFeedbackTone(type, startTime = 0) {
      const selection = getSelectedSound(type);
      const option = feedbackOptions[type][selection];
      playSoundOption(option, startTime, TEST_TUNING.feedbackVolume);
    }

    function getSelectionStorageKey(category) {
      return category === "acceptable" ? "om-feedback-acceptable" : "om-feedback-outside";
    }

    function getSelectedSound(category) {
      const key = getSelectionStorageKey(category);
      const inputs = category === "acceptable" ? acceptableInputs : outsideInputs;
      const stored = localStorage.getItem(key);
      const fallback = inputs.find((input) => input.value.endsWith("-a"))?.value || inputs[0]?.value;
      if (stored && feedbackOptions[category][stored]) {
        return stored;
      }
      return fallback;
    }

    function storeSelection(category, value) {
      localStorage.setItem(getSelectionStorageKey(category), value);
    }

    function applyStoredSelections() {
      const acceptableSelection = getSelectedSound("acceptable");
      const outsideSelection = getSelectedSound("outside");
      acceptableInputs.forEach((input) => {
        input.checked = input.value === acceptableSelection;
      });
      outsideInputs.forEach((input) => {
        input.checked = input.value === outsideSelection;
      });
      if (acceptableSelection) storeSelection("acceptable", acceptableSelection);
      if (outsideSelection) storeSelection("outside", outsideSelection);
    }

    /* ---------------- Setup / timing ---------------- */
    function lockSettings(lock) {
      setupControls.forEach((control) => { control.disabled = lock; });
      a11yControls.forEach((control) => { control.disabled = lock; });
    }

    function getTimingInputs() {
      return {
        clearTime: Number(clearTimeInput.value),
        fullTime: Number(fullTimeInput.value)
      };
    }

    function getMargin() {
      return Number(marginInput.value);
    }

    function normalizeTimingValue(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return "";
      return String(parsed);
    }

    function encodeBase64Url(value) {
      const bytes = new TextEncoder().encode(value);
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeBase64Url(value) {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    function computeShareChecksum(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
    }

    function buildShareTimingToken() {
      const clearTime = normalizeTimingValue(clearTimeInput.value);
      const fullTime = normalizeTimingValue(fullTimeInput.value);
      const margin = normalizeTimingValue(marginInput.value);
      const rawPayload = `${clearTime}|${fullTime}|${margin}`;
      const encodedPayload = encodeBase64Url(rawPayload);
      const checksum = computeShareChecksum(encodedPayload);
      return `v1.${encodedPayload}.${checksum}`;
    }

    function buildShareTimingLink() {
      const url = new URL(window.location.href);
      url.hash = `ts=${buildShareTimingToken()}`;
      return url.toString();
    }

    function buildRegularSiteLink() {
      const url = new URL(window.location.href);
      url.hash = "";
      return url.toString();
    }

    function buildSetupTimingMessage() {
      return ["Click here once to configure times:", buildShareTimingLink()].join("\n");
    }

    function buildPracticeTimingMessage() {
      return ["Save/use this link to practice:", buildRegularSiteLink()].join("\n");
    }

    function populateShareMessagePreviews() {
      setupTimingMessage.value = buildSetupTimingMessage();
      practiceTimingMessage.value = buildPracticeTimingMessage();
    }

    async function copyTextToClipboard(text) {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable.");
        }
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "absolute";
        helper.style.left = "-9999px";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        document.body.removeChild(helper);
        return true;
      }
    }

    function clearImportedHash() {
      const cleanedUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanedUrl);
    }

    function importSharedTimingSettings() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash.startsWith("ts=")) return false;

      const token = hash.slice(3);
      const [version, encodedPayload, checksum] = token.split(".");
      const invalid = () => {
        pendingStatusMessage = "This time settings link is invalid.";
        clearImportedHash();
        return true;
      };

      if (version !== "v1" || !encodedPayload || !checksum) return invalid();
      if (computeShareChecksum(encodedPayload) !== checksum) return invalid();

      let decodedPayload;
      try {
        decodedPayload = decodeBase64Url(encodedPayload);
      } catch (error) {
        return invalid();
      }

      const [clearValue, fullValue, marginValue] = decodedPayload.split("|");
      const normalizedClear = normalizeTimingValue(clearValue);
      const normalizedFull = normalizeTimingValue(fullValue);
      const normalizedMargin = normalizeTimingValue(marginValue);
      const clearNumber = Number(normalizedClear);
      const fullNumber = Number(normalizedFull);
      const marginNumber = Number(normalizedMargin);

      if (
        !normalizedClear || !normalizedFull || !normalizedMargin ||
        !Number.isFinite(clearNumber) || !Number.isFinite(fullNumber) || !Number.isFinite(marginNumber) ||
        clearNumber <= 0 || fullNumber <= 0 || marginNumber < 0
      ) {
        return invalid();
      }

      clearTimeInput.value = normalizedClear;
      fullTimeInput.value = normalizedFull;
      marginInput.value = normalizedMargin;
      localStorage.setItem("om-clear-time", normalizedClear);
      localStorage.setItem("om-full-time", normalizedFull);
      localStorage.setItem("om-margin", normalizedMargin);
      pendingStatusMessage = "Time settings updated for this device.";
      clearImportedHash();
      refreshTimingRequirementPrompt();
      updateNextPrompt();
      return true;
    }

    async function copyShareTimingLink() {
      if (!validateSetup()) return;
      populateShareMessagePreviews();
      await copyTextToClipboard(setupTimingMessage.value);
      setStatus("Setup message ready. Practice message is shown below.");
      announceScreenReader("Setup message ready. Practice message is shown below.");
    }

    function getMissingTimingFields() {
      const { clearTime, fullTime } = getTimingInputs();
      const missing = [];
      if (!Number.isFinite(clearTime) || clearTime <= 0) missing.push("clear");
      if (!Number.isFinite(fullTime) || fullTime <= 0) missing.push("full");
      return missing;
    }

    function getTimingRequirementMessage() {
      const missing = getMissingTimingFields();
      if (missing.length === 0) return "";
      if (missing.length === 2) {
        return "Enter the time to clear from left and full street time in Settings before using practice or exemplars.";
      }
      if (missing[0] === "clear") {
        return "Enter the time to clear from left in Settings before using practice or exemplars.";
      }
      return "Enter the full street time in Settings before using practice or exemplars.";
    }

    function refreshTimingRequirementPrompt() {
      const message = getTimingRequirementMessage();
      const hasMissingTimes = Boolean(message);
      timingRequiredPrompt.hidden = !hasMissingTimes;
      timingRequiredPromptText.textContent = message || "Enter both street times in Settings before using practice or exemplars.";
      return !hasMissingTimes;
    }

    function focusFirstMissingTimingField() {
      const missing = getMissingTimingFields();
      const target = missing[0] === "clear"
        ? clearTimeInput
        : missing[0] === "full"
          ? fullTimeInput
          : clearTimeInput;
      target.focus();
      target.select?.();
    }

    function openSettingsForTimingEntry() {
      if (!settingsModal.open) {
        lastDialogTrigger = timingRequiredPromptButton;
        lockPageScroll();
        setMainContentInert(true);
        settingsModal.showModal();
      }
      requestAnimationFrame(() => { focusFirstMissingTimingField(); });
    }

    function requireTimingInputs() {
      const message = getTimingRequirementMessage();
      if (!message) {
        refreshTimingRequirementPrompt();
        if (!started) setStatus("");
        return true;
      }
      refreshTimingRequirementPrompt();
      setStatus("");
      announceScreenReader(message);
      if (settingsModal.open) {
        focusFirstMissingTimingField();
      } else {
        timingRequiredPromptButton.focus();
      }
      return false;
    }

    function getTextSizeScale(size) {
      if (size === "smaller") return 16 / 18;
      if (size === "large") return 1.15;
      if (size === "largest") return 1.3;
      if (size === "huge") return 1.5;
      if (size === "xl") return 2;
      if (size === "xxl") return 2.5;
      if (size === "max") return 3;
      return 1;
    }

    function validateSetup() {
      const margin = getMargin();
      if (!requireTimingInputs()) return false;
      if (!Number.isFinite(margin) || margin < 0) {
        setStatus("Enter a margin of error before starting.", "warn");
        emitCue("validation_error", { message: "Need a margin of error before starting." });
        return false;
      }
      return true;
    }

    // Single source of truth for reference times — the old build had two
    // near-identical copies of this that could drift apart.
    function getReferenceTimes(mode = currentMode) {
      const { clearTime, fullTime } = getTimingInputs();
      if (mode === "2") return [0, fullTime];
      if (mode === "2b") return [0, clearTime];
      return [0, clearTime, fullTime];
    }

    // Single source of truth for acceptable-vs-outside. The old build computed
    // this twice inside beginReplay (once for audio, once for the visual event
    // list); if one copy were tuned, sound and visuals would silently disagree.
    function classifyMark(userTime, referenceTime) {
      const diff = Math.abs((userTime ?? 0) - referenceTime);
      const latency = (audioContext?.baseLatency || 0) + (audioContext?.outputLatency || 0);
      const timingEpsilon = Math.max(0.02, latency);
      const feedbackType = diff <= getMargin() + timingEpsilon ? "acceptable" : "outside";
      return { diff, feedbackType };
    }

    /* ---------------- Visual replay ---------------- */
    function getUserFlashColor() {
      return VISUAL_USER_FLASH_COLORS[a11ySettings.userFlashContrast] || VISUAL_USER_FLASH_COLORS.soft;
    }

    function applyVisualReplayFrame(elapsedSec) {
      if (elapsedSec < VISUAL_REPLAY_PRE_DELAY_SEC) return;
      const overlay = visualReplayState.target?.overlay || visualReplayOverlay;
      const flash = visualReplayState.target?.flash || visualReplayFlash;
      const shape = visualReplayState.target?.shape || visualReplayShape;
      const isUserPulseActive = elapsedSec < visualReplayState.userFlashUntilSec;
      const isReferencePulseActive = elapsedSec < visualReplayState.referenceUntilSec;
      overlay.dataset.active = "true";
      flash.style.background = isUserPulseActive ? getUserFlashColor() : "#000000";
      if (isReferencePulseActive && visualReplayState.currentReferenceType) {
        shape.style.display = "block";
        shape.dataset.type = visualReplayState.currentReferenceType;
        shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
      } else {
        shape.style.display = "none";
      }
    }

    function hideVisualReplayFrame() {
      const overlay = visualReplayState.target?.overlay || visualReplayOverlay;
      const flash = visualReplayState.target?.flash || visualReplayFlash;
      const shape = visualReplayState.target?.shape || visualReplayShape;
      overlay.dataset.active = "false";
      flash.style.background = "transparent";
      shape.style.display = "none";
      visualReplayState.userFlashUntilSec = 0;
      visualReplayState.referenceUntilSec = 0;
      visualReplayState.currentReferenceType = null;
      visualReplayState.target = null;
    }

    function playVisualPreview(type) {
      const previewTarget = {
        overlay: settingsVisualPreview,
        flash: settingsVisualPreviewFlash,
        shape: settingsVisualPreviewShape
      };
      const timing = TEST_TUNING.visualPreviewTimingMs;
      const leadInMs = type === "user" ? timing.userEnter : timing.shapeEnter;
      const visibleMs = type === "user" ? timing.userVisible : timing.shapeVisible;
      const exitMs = type === "user" ? timing.userExit : timing.shapeExit;
      const totalMs = leadInMs + visibleMs + exitMs;

      previewTarget.overlay.dataset.active = "true";
      previewTarget.flash.style.background = "#000000";
      previewTarget.shape.style.display = "none";

      setTimeout(() => {
        if (type === "user") {
          previewTarget.flash.style.background = getUserFlashColor();
          return;
        }
        previewTarget.shape.dataset.type = type;
        previewTarget.shape.dataset.outsideVariant = a11ySettings.outsideVisualVariant;
        previewTarget.shape.style.display = "block";
      }, leadInMs);

      setTimeout(() => {
        previewTarget.flash.style.background = "#000000";
        previewTarget.shape.style.display = "none";
      }, leadInMs + visibleMs);

      setTimeout(() => {
        previewTarget.overlay.dataset.active = "false";
        previewTarget.flash.style.background = "transparent";
        previewTarget.shape.style.display = "none";
      }, totalMs);
    }

    function triggerVisualReplayEvent(event, elapsedSec) {
      if (event.type === "user") {
        visualReplayState.userFlashUntilSec = Math.max(
          visualReplayState.userFlashUntilSec,
          elapsedSec + VISUAL_PULSE_SEC
        );
        return;
      }
      if (event.type === "reference") {
        visualReplayState.currentReferenceType = event.feedbackType;
        visualReplayState.referenceUntilSec = Math.max(
          visualReplayState.referenceUntilSec,
          elapsedSec + VISUAL_PULSE_SEC
        );
      }
    }

    function stopVisualReplay() {
      if (visualReplayState.rafId !== null) {
        cancelAnimationFrame(visualReplayState.rafId);
        visualReplayState.rafId = null;
      }
      hideVisualReplayFrame();
    }

    function startSynchronizedVisualReplay(events, endAtSec, target = null) {
      if (!visualOutputEnabled() || !a11ySettings.syncVisualReplay) return;
      stopVisualReplay();
      const context = ensureAudioContext();
      visualReplayState.events = [...events].sort((a, b) => a.timeSec - b.timeSec);
      visualReplayState.nextIndex = 0;
      visualReplayState.endAtSec = endAtSec;
      visualReplayState.replayStartTime = context.currentTime;
      visualReplayState.userFlashUntilSec = 0;
      visualReplayState.referenceUntilSec = 0;
      visualReplayState.currentReferenceType = null;
      visualReplayState.target = target;

      const frame = () => {
        const elapsedSec = context.currentTime - visualReplayState.replayStartTime;
        while (
          visualReplayState.nextIndex < visualReplayState.events.length &&
          elapsedSec >= visualReplayState.events[visualReplayState.nextIndex].timeSec
        ) {
          triggerVisualReplayEvent(visualReplayState.events[visualReplayState.nextIndex], elapsedSec);
          visualReplayState.nextIndex += 1;
        }
        applyVisualReplayFrame(elapsedSec);
        const done =
          elapsedSec >= visualReplayState.endAtSec &&
          visualReplayState.nextIndex >= visualReplayState.events.length &&
          elapsedSec >= visualReplayState.userFlashUntilSec &&
          elapsedSec >= visualReplayState.referenceUntilSec;
        if (done) {
          stopVisualReplay();
          return;
        }
        visualReplayState.rafId = requestAnimationFrame(frame);
      };

      visualReplayState.rafId = requestAnimationFrame(frame);
    }

    /* ---------------- Exemplars ---------------- */
    function playExemplar(mode) {
      const labels = modes[mode]?.labels;
      if (!labels) return;
      if (!requireTimingInputs()) {
        emitCue("validation_error", { message: getTimingRequirementMessage() });
        return;
      }
      const times = getReferenceTimes(mode);

      clearTimeout(exemplarTimeout);
      clearExemplarVisuals();
      suppressSrAnnouncements = true;
      actionBtn.classList.remove("idle");
      actionBtn.classList.add("running");
      actionBtn.disabled = true;
      setActionButtonLabel("Exemplar");
      setActionButtonHint("Listen");
      const sequenceLabel = labels.join(" to ");
      setStatus(`Playing exemplar: ${sequenceLabel}.`);
      emitCue("replay_start", { mode, exemplar: true });

      const baseDelay = TEST_TUNING.exemplarLeadInSec;
      const visualEvents = labels.map((_, index) => ({
        timeSec: baseDelay + (times[index] ?? 0),
        type: "user"
      }));
      const doneAtSec = baseDelay + Math.max(...times) + TEST_TUNING.exemplarEndPadSec;
      const exemplarVisualTarget = settingsModal.open ? {
        overlay: settingsVisualPreview,
        flash: settingsVisualPreviewFlash,
        shape: settingsVisualPreviewShape
      } : null;
      startSynchronizedVisualReplay(visualEvents, doneAtSec, exemplarVisualTarget);

      labels.forEach((label, index) => {
        const time = times[index] ?? 0;
        exemplarVisualTimeouts.push(
          setTimeout(() => { setActionButtonStageByLabel(label); }, (baseDelay + time) * 1000)
        );
        playUserMarkerTone(baseDelay + time);
      });

      exemplarTimeout = setTimeout(() => {
        suppressSrAnnouncements = false;
        actionBtn.classList.remove("running");
        actionBtn.classList.add("idle");
        actionBtn.disabled = false;
        setActionButtonLabel("Begin");
        setActionButtonHint("Tap when you step off");
        setActionButtonStageByLabel("");
        setStatus("Exemplar complete. Ready.");
        emitCue("replay_end", { message: "Exemplar complete. Ready." });
      }, doneAtSec * 1000);
    }

    /* ---------------- Markers / stage UI ---------------- */
    function updateMode() {
      const selected = modeInputs.find((input) => input.checked);
      currentMode = selected?.value || "2b";
      localStorage.setItem("om-mode", currentMode);
      renderMarkers();
      resetState();
    }

    function renderMarkers() {
      markersEl.innerHTML = "";
      const { labels } = modes[currentMode];
      labels.forEach((label, index) => {
        const item = document.createElement("div");
        item.className = "marker";
        item.dataset.index = String(index);
        item.dataset.label = label;
        const shape = document.createElement("div");
        shape.className = "marker-shape";
        shape.setAttribute("aria-hidden", "true");
        shape.textContent = getIndicatorSymbolForLabel(label);
        const text = document.createElement("span");
        text.className = "marker-label";
        text.setAttribute("aria-hidden", "true");
        text.textContent = label;
        item.append(shape, text);
        markersEl.appendChild(item);
      });
      updateMarkerStates();
    }

    function updateMarkerStates() {
      const markerNodes = [...markersEl.querySelectorAll(".marker")];
      markerNodes.forEach((node, index) => {
        node.classList.toggle("complete", index < stage);
        node.classList.toggle("current", index === stage && started);
      });
      updateMarkersSummary();
      updateActionButtonStage();
    }

    function updateMarkersSummary() {
      const markerNodes = [...markersEl.querySelectorAll(".marker")];
      const summaries = markerNodes.map((node) => {
        const label = node.dataset.label || "";
        if (node.classList.contains("complete")) return `${label} complete`;
        if (node.classList.contains("current")) return `${label} current`;
        return `${label} not reached`;
      });
      markersEl.setAttribute("aria-label", `Progress markers: ${summaries.join(", ")}`);
    }

    function getStageClassForLabel(label) {
      const normalized = String(label || "").trim().toLowerCase();
      if (normalized === "start") return "stage-start";
      if (normalized === "halfway") return "stage-halfway";
      if (normalized === "finish") return "stage-finish";
      return "";
    }

    function getIndicatorSymbolForLabel(label) {
      const normalized = String(label || "").trim().toLowerCase();
      if (normalized === "start") return "●";
      if (normalized === "halfway") return "▲";
      if (normalized === "finish") return "■";
      return "○";
    }

    function setActionButtonStageByLabel(label) {
      actionBtn.classList.remove("stage-start", "stage-halfway", "stage-finish");
      const stageClass = getStageClassForLabel(label);
      if (stageClass) actionBtn.classList.add(stageClass);
      actionBtnIndicator.textContent = getIndicatorSymbolForLabel(label);
    }

    function updateActionButtonStage() {
      setActionButtonStageByLabel("");
      if (!started || stage <= 0) return;
      const labels = modes[currentMode]?.labels || [];
      if (labels.length === 0) return;
      const clampedIndex = Math.min(stage - 1, labels.length - 1);
      setActionButtonStageByLabel(labels[clampedIndex]);
    }

    function clearExemplarVisuals() {
      exemplarVisualTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      exemplarVisualTimeouts = [];
      stopVisualReplay();
    }

    function setStatus(message, tone = "neutral") {
      cueBannerText.textContent = message;
      cueBanner.dataset.tone = tone;
      syncCueBannerVisibility();
    }

    function announceScreenReader(message) {
      if (!a11ySettings.announceCues) return;
      if (suppressSrAnnouncements) return;
      srAnnouncer.textContent = "";
      setTimeout(() => {
        if (suppressSrAnnouncements) return;
        srAnnouncer.textContent = message;
      }, 20);
    }

    function visualOutputEnabled() {
      return a11ySettings.outputMode !== "audio-only";
    }

    function applyDebugAccessibility() {
      debugText.setAttribute("aria-live", showDebug ? "polite" : "off");
      debugText.setAttribute("aria-hidden", showDebug ? "false" : "true");
      if (!showDebug) debugText.textContent = "";
    }

    function lockModeSelection(lock) {
      modeInputs.forEach((input) => { input.disabled = lock; });
    }

    function setActionButtonLabel(label) {
      actionBtnLabel.textContent = label;
      actionBtn.setAttribute("aria-label", label);
    }

    function setActionButtonHint(hint) {
      actionBtnHint.textContent = hint;
      actionBtnHint.style.display = hint ? "" : "none";
    }

    function resetState(message = "Ready.") {
      clearTimeout(exemplarTimeout);
      clearExemplarVisuals();
      suppressSrAnnouncements = false;
      markerTimes = [];
      stage = 0;
      started = false;
      actionBtn.disabled = false;
      actionBtn.classList.remove("running");
      actionBtn.classList.add("idle");
      setActionButtonLabel("Begin");
      setActionButtonHint("Tap when you step off");
      setStatus(message);
      updateNextPrompt();
      debugText.textContent = "";
      updateMarkerStates();
      lockModeSelection(false);
      lockSettings(false);
      setActionButtonStageByLabel("");
    }

    function updateNextPrompt(justMarkedLabel = "") {
      if (!started) {
        if (!refreshTimingRequirementPrompt()) {
          setStatus("");
          return;
        }
        setStatus("");
        return;
      }
      const labels = modes[currentMode].labels;
      const nextLabel = labels[stage] || "Next";
      // The old build emitted a "Marker recorded" banner and then overwrote it
      // on the very next statement, so it was never actually readable. Both
      // facts now live in one message.
      const prefix = justMarkedLabel ? `${justMarkedLabel} marked. ` : "";
      setStatus(`${prefix}Press Mark for ${nextLabel}.`);
    }

    /* ---------------- Practice flow ---------------- */
    function recordMarker() {
      if (!started) {
        if (!validateSetup()) return;
        started = true;
        lockModeSelection(true);
        lockSettings(true);
        markerTimes = [0];
        stage = 1;
        setActionButtonLabel("Mark");
        setActionButtonHint("Tap at each point");
        playConfirmTone();
        actionBtn.classList.remove("idle");
        actionBtn.classList.add("running");
        emitCue("start", { mode: currentMode });
        updateNextPrompt();
        updateMarkerStates();
        return;
      }

      const elapsed = (performance.now() - startTimestamp) / 1000;
      markerTimes.push(elapsed);
      playConfirmTone();
      stage += 1;
      const markedLabel = modes[currentMode].labels[stage - 1];
      // skipBanner: the banner text is owned by updateNextPrompt / the replay
      // message below. Haptics and the screen-reader announcement still fire.
      emitCue("marker", { stageLabel: markedLabel, skipBanner: true });

      if (stage >= modes[currentMode].labels.length) {
        actionBtn.disabled = true;
        setActionButtonLabel("Replay");
        setActionButtonHint("Listen");
        setStatus("Replaying your markers and the reference.");
        updateMarkerStates();
        beginReplay();
      } else {
        updateNextPrompt(markedLabel);
        updateMarkerStates();
      }
    }

    function beginReplay() {
      const reference = getReferenceTimes();
      const labels = modes[currentMode].labels;
      const baseDelay = TEST_TUNING.replayLeadInSec;
      const maxTime = Math.max(...markerTimes, ...reference);
      clearExemplarVisuals();
      emitCue("replay_start", { referenceTimes: reference, markerTimes });
      suppressSrAnnouncements = true;

      if (labels[0]) {
        exemplarVisualTimeouts.push(
          setTimeout(() => { setActionButtonStageByLabel(labels[0]); }, baseDelay * 1000)
        );
      }

      markerTimes.forEach((time) => {
        if (replayUsesConfirmTone) {
          playConfirmTone(baseDelay + time);
          return;
        }
        playUserMarkerTone(baseDelay + time);
      });

      if (showDebug) {
        const userTimes = markerTimes.map((time) => time.toFixed(2)).join(", ");
        const refTimes = reference.map((time) => time.toFixed(2)).join(", ");
        debugText.textContent = `User: ${userTimes}s | Ref: ${refTimes}s`;
      } else {
        debugText.textContent = "";
      }

      // One classification pass drives audio, visuals, cues and haptics.
      const marks = reference.slice(1).map((time, index) => ({
        time,
        index,
        label: labels[index + 1] || "Reference",
        ...classifyMark(markerTimes[index + 1], time)
      }));

      marks.forEach(({ time, index, label, diff, feedbackType }) => {
        playFeedbackTone(feedbackType, baseDelay + time);
        exemplarVisualTimeouts.push(
          setTimeout(() => { setActionButtonStageByLabel(labels[index + 1]); }, (baseDelay + time) * 1000)
        );
        const cueType = feedbackType === "acceptable" ? "reference_ok" : "reference_bad";
        exemplarVisualTimeouts.push(
          setTimeout(() => { emitCue(cueType, { stageLabel: label, diff }); }, (baseDelay + time) * 1000)
        );
      });

      const visualEvents = [
        ...markerTimes.map((time) => ({ timeSec: baseDelay + time, type: "user" })),
        ...marks.map(({ time, feedbackType }) => ({
          timeSec: baseDelay + time,
          type: "reference",
          feedbackType
        }))
      ];
      const replayDoneAtSec = maxTime + baseDelay + TEST_TUNING.replayEndPadSec;
      startSynchronizedVisualReplay(visualEvents, replayDoneAtSec);

      clearTimeout(replayTimeout);
      replayTimeout = setTimeout(() => {
        suppressSrAnnouncements = false;
        resetState("Ready for another try.");
        emitCue("replay_end", { message: "Ready for another try." });
      }, replayDoneAtSec * 1000);
    }

    /* ---------------- Cues ---------------- */
    function emitCue(type, detail = {}) {
      const messages = {
        start: "Started.",
        marker: `Marker recorded${detail.stageLabel ? `: ${detail.stageLabel}` : ""}.`,
        replay_start: "Replay.",
        replay_end: detail.message || "Ready for another try.",
        validation_error: detail.message || "Need more information to start.",
        reference_ok: `Reference: acceptable${detail.stageLabel ? ` for ${detail.stageLabel}` : ""}.`,
        reference_bad: `Reference: outside tolerance${detail.stageLabel ? ` for ${detail.stageLabel}` : ""}.`
      };
      // Named bannerTones, not tones — the module-level `tones` object holds
      // oscillator frequencies and must not be shadowed here.
      const bannerTones = {
        reference_ok: "ok",
        reference_bad: "warn",
        validation_error: "warn"
      };
      const message = messages[type] || "Updated.";

      // During replay the banner is the only visual channel a Deaf or
      // DeafBlind user has, so reference results are allowed through even
      // while screen-reader speech is suppressed.
      const isReplayResult = type === "reference_ok" || type === "reference_bad";
      const bannerAllowed = a11ySettings.showBanner && !detail.skipBanner &&
        (!suppressSrAnnouncements || isReplayResult);
      if (bannerAllowed) {
        cueBannerText.textContent = message;
        cueBanner.dataset.tone = bannerTones[type] || "neutral";
      }
      syncCueBannerVisibility();
      announceScreenReader(message);
      hapticCue(type);

      if (a11ySettings.flashAction && !prefersReducedMotion.matches) {
        actionBtn.classList.add("flash");
        clearTimeout(flashTimeout);
        flashTimeout = setTimeout(() => { actionBtn.classList.remove("flash"); }, 160);
      }
    }

    /* ---------------- Settings application ---------------- */
    function applyA11ySettings() {
      document.body.dataset.textSize = a11ySettings.textSize;
      document.documentElement.style.fontSize = `${18 * getTextSizeScale(a11ySettings.textSize)}px`;
      cueBannerText.classList.toggle("sr-only", !a11ySettings.useTextLabels);
      document.body.classList.toggle("high-contrast", a11ySettings.highContrast);
      document.body.classList.toggle("focus-boost", a11ySettings.focusBoost);
      const resolvedTheme = a11ySettings.theme === "system"
        ? (prefersDarkScheme.matches ? "dark" : "light")
        : a11ySettings.theme;
      document.body.dataset.theme = resolvedTheme;
      textSizeLandscapeHint.hidden = !["huge", "xl", "xxl", "max"].includes(a11ySettings.textSize);
      textSizeLandscapeHint.textContent = textSizeLandscapeHint.hidden
        ? ""
        : "At this size, portrait orientation keeps every control reachable.";
      const visualReplayAvailable = visualOutputEnabled();
      a11ySyncVisualReplay.disabled = !visualReplayAvailable;
      if (!visualReplayAvailable) a11ySyncVisualReplay.checked = false;
      syncCueBannerVisibility();
      applyLayoutMode();
      updateNativeStatusBar(resolvedTheme);
    }

    function updateNativeStatusBar(resolvedTheme) {
      const StatusBar = CapacitorGlobal?.Plugins?.StatusBar;
      if (!isNativeShell || !StatusBar) return;
      try {
        StatusBar.setStyle({ style: resolvedTheme === "light" ? "LIGHT" : "DARK" });
      } catch (error) {
        /* non-fatal */
      }
    }

    function restoreStoredSettings() {
      const storedClear = localStorage.getItem("om-clear-time");
      const storedFull = localStorage.getItem("om-full-time");
      const storedMargin = localStorage.getItem("om-margin");
      const storedMode = localStorage.getItem("om-mode");
      const storedReplay = localStorage.getItem("om-replay-use-confirm");
      const storedDebug = localStorage.getItem("om-debug-replay");
      const storedOutputMode = localStorage.getItem("om-a11y-output-mode");
      const storedShowBanner = localStorage.getItem("om-a11y-show-banner");
      const storedFlashAction = localStorage.getItem("om-a11y-flash-action");
      const storedVibrate = localStorage.getItem("om-a11y-vibrate");
      const storedUseTextLabels = localStorage.getItem("om-a11y-use-text-labels");
      const storedTheme = localStorage.getItem("om-a11y-theme");
      const storedTextSize = localStorage.getItem("om-a11y-text-size");
      const storedHighContrast = localStorage.getItem("om-a11y-high-contrast");
      const storedFocusBoost = localStorage.getItem("om-a11y-focus-boost");
      const storedAnnounceCues = localStorage.getItem("om-a11y-announce-cues");
      const storedSyncVisualReplay = localStorage.getItem("om-a11y-sync-visual-replay");
      const storedOutsideVisualVariant = localStorage.getItem("om-a11y-outside-visual-variant");
      const storedUserFlashContrast = localStorage.getItem("om-a11y-user-flash-contrast");

      if (storedClear) clearTimeInput.value = storedClear;
      if (storedFull) fullTimeInput.value = storedFull;
      if (storedMargin) marginInput.value = storedMargin;
      if (storedMode && modes[storedMode]) {
        currentMode = storedMode;
        modeInputs.forEach((input) => { input.checked = input.value === storedMode; });
      }
      replayUsesConfirmTone = storedReplay === "true";
      replayUsesConfirm.checked = replayUsesConfirmTone;
      showDebug = storedDebug === "true";
      debugToggle.checked = showDebug;
      applyDebugAccessibility();

      if (storedOutputMode) {
        a11ySettings.outputMode = storedOutputMode;
        outputModeInputs.forEach((input) => { input.checked = input.value === storedOutputMode; });
      }
      if (storedShowBanner) a11ySettings.showBanner = storedShowBanner === "true";
      if (storedFlashAction) a11ySettings.flashAction = storedFlashAction === "true";
      if (storedVibrate) a11ySettings.vibrate = storedVibrate === "true";
      if (storedUseTextLabels) a11ySettings.useTextLabels = storedUseTextLabels === "true";
      if (storedTheme) a11ySettings.theme = storedTheme;
      if (storedTextSize) a11ySettings.textSize = storedTextSize;
      if (storedHighContrast) a11ySettings.highContrast = storedHighContrast === "true";
      if (storedFocusBoost) a11ySettings.focusBoost = storedFocusBoost === "true";
      if (storedAnnounceCues) a11ySettings.announceCues = storedAnnounceCues === "true";
      if (storedSyncVisualReplay) a11ySettings.syncVisualReplay = storedSyncVisualReplay === "true";
      if (storedOutsideVisualVariant === "up" || storedOutsideVisualVariant === "down") {
        a11ySettings.outsideVisualVariant = storedOutsideVisualVariant;
      }
      if (storedUserFlashContrast && VISUAL_USER_FLASH_COLORS[storedUserFlashContrast]) {
        a11ySettings.userFlashContrast = storedUserFlashContrast;
      }

      a11yShowBanner.checked = a11ySettings.showBanner;
      a11yFlashAction.checked = a11ySettings.flashAction;
      a11yVibrate.checked = a11ySettings.vibrate;
      a11yUseTextLabels.checked = a11ySettings.useTextLabels;
      a11ySyncVisualReplay.checked = a11ySettings.syncVisualReplay;
      outsideVisualVariantInputs.forEach((input) => {
        input.checked = input.value === a11ySettings.outsideVisualVariant;
      });
      userFlashContrastInputs.forEach((input) => {
        input.checked = input.value === a11ySettings.userFlashContrast;
      });
      a11yTheme.value = a11ySettings.theme;
      a11yTextSize.value = a11ySettings.textSize;
      a11yHighContrast.checked = a11ySettings.highContrast;
      a11yFocusBoost.checked = a11ySettings.focusBoost;
      a11yAnnounceCues.checked = a11ySettings.announceCues;
      applyA11ySettings();
    }

    /* ---------------- Event wiring ---------------- */
    actionBtn.addEventListener("click", () => {
      ensureAudioContext();
      if (!started) startTimestamp = performance.now();
      recordMarker();
    });

    modeInputs.forEach((input) => { input.addEventListener("change", updateMode); });

    settingsTrigger.addEventListener("click", () => {
      lastDialogTrigger = settingsTrigger;
      lockPageScroll();
      setMainContentInert(true);
      settingsModal.showModal();
      settingsTitle.focus();
    });

    closeSettings.addEventListener("click", () => { settingsModal.close(); });

    a11yTrigger.addEventListener("click", () => {
      lastDialogTrigger = a11yTrigger;
      lockPageScroll();
      setMainContentInert(true);
      a11yModal.showModal();
      a11yTitle.focus();
    });

    closeA11y.addEventListener("click", () => { a11yModal.close(); });

    timingRequiredPromptButton.addEventListener("click", () => { openSettingsForTimingEntry(); });

    settingsModal.addEventListener("close", () => {
      settingsVisualPreview.dataset.active = "false";
      settingsVisualPreviewFlash.style.background = "transparent";
      settingsVisualPreviewShape.style.display = "none";
      if (!a11yModal.open) {
        unlockPageScroll();
        setMainContentInert(false);
      }
      lastDialogTrigger?.focus();
    });

    a11yModal.addEventListener("close", () => {
      if (!settingsModal.open) {
        unlockPageScroll();
        setMainContentInert(false);
      }
      lastDialogTrigger?.focus();
    });

    acceptableInputs.forEach((input) => {
      input.addEventListener("change", () => { storeSelection("acceptable", input.value); });
    });

    outsideInputs.forEach((input) => {
      input.addEventListener("change", () => { storeSelection("outside", input.value); });
    });

    previewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudioContext();
        const soundId = button.dataset.sound;
        if (feedbackOptions.acceptable[soundId]) {
          playSoundOption(feedbackOptions.acceptable[soundId], 0, TEST_TUNING.feedbackVolume);
          return;
        }
        if (feedbackOptions.outside[soundId]) {
          playSoundOption(feedbackOptions.outside[soundId], 0, TEST_TUNING.feedbackVolume);
        }
      });
    });

    previewUserSoundBtn.addEventListener("click", () => {
      ensureAudioContext();
      if (replayUsesConfirmTone) {
        playConfirmTone(0);
        return;
      }
      playUserMarkerTone(0);
    });

    visualPreviewButtons.forEach((button) => {
      button.addEventListener("click", () => { playVisualPreview(button.dataset.visualType); });
    });

    outsideVisualVariantInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.outsideVisualVariant = input.value;
        localStorage.setItem("om-a11y-outside-visual-variant", a11ySettings.outsideVisualVariant);
      });
    });

    userFlashContrastInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.userFlashContrast = input.value;
        localStorage.setItem("om-a11y-user-flash-contrast", a11ySettings.userFlashContrast);
      });
    });

    exemplarButtons.forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudioContext();
        playExemplar(button.dataset.exemplarMode);
      });
    });

    replayUsesConfirm.addEventListener("change", () => {
      replayUsesConfirmTone = replayUsesConfirm.checked;
      localStorage.setItem("om-replay-use-confirm", String(replayUsesConfirmTone));
    });

    debugToggle.addEventListener("change", () => {
      showDebug = debugToggle.checked;
      localStorage.setItem("om-debug-replay", String(showDebug));
      applyDebugAccessibility();
    });

    clearTimeInput.addEventListener("input", () => { refreshTimingRequirementPrompt(); });
    clearTimeInput.addEventListener("change", () => {
      localStorage.setItem("om-clear-time", clearTimeInput.value);
      refreshTimingRequirementPrompt();
      updateNextPrompt();
    });

    fullTimeInput.addEventListener("input", () => { refreshTimingRequirementPrompt(); });
    fullTimeInput.addEventListener("change", () => {
      localStorage.setItem("om-full-time", fullTimeInput.value);
      refreshTimingRequirementPrompt();
      updateNextPrompt();
    });

    marginInput.addEventListener("change", () => {
      localStorage.setItem("om-margin", marginInput.value);
    });

    outputModeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        a11ySettings.outputMode = input.value;
        localStorage.setItem("om-a11y-output-mode", input.value);
        const wantsVisual = a11ySettings.outputMode !== "audio-only";
        a11ySettings.syncVisualReplay = wantsVisual;
        a11ySyncVisualReplay.checked = wantsVisual;
        localStorage.setItem("om-a11y-sync-visual-replay", String(wantsVisual));
        applyA11ySettings();
      });
    });

    a11yShowBanner.addEventListener("change", () => {
      a11ySettings.showBanner = a11yShowBanner.checked;
      localStorage.setItem("om-a11y-show-banner", String(a11ySettings.showBanner));
      applyA11ySettings();
    });

    a11yFlashAction.addEventListener("change", () => {
      a11ySettings.flashAction = a11yFlashAction.checked;
      localStorage.setItem("om-a11y-flash-action", String(a11ySettings.flashAction));
    });

    a11yVibrate.addEventListener("change", () => {
      a11ySettings.vibrate = a11yVibrate.checked;
      localStorage.setItem("om-a11y-vibrate", String(a11ySettings.vibrate));
    });

    a11yUseTextLabels.addEventListener("change", () => {
      a11ySettings.useTextLabels = a11yUseTextLabels.checked;
      localStorage.setItem("om-a11y-use-text-labels", String(a11ySettings.useTextLabels));
      applyA11ySettings();
    });

    a11yTheme.addEventListener("change", () => {
      a11ySettings.theme = a11yTheme.value;
      localStorage.setItem("om-a11y-theme", a11ySettings.theme);
      applyA11ySettings();
    });

    a11yTextSize.addEventListener("change", () => {
      a11ySettings.textSize = a11yTextSize.value;
      localStorage.setItem("om-a11y-text-size", a11ySettings.textSize);
      applyA11ySettings();
    });

    a11yHighContrast.addEventListener("change", () => {
      a11ySettings.highContrast = a11yHighContrast.checked;
      localStorage.setItem("om-a11y-high-contrast", String(a11ySettings.highContrast));
      applyA11ySettings();
    });

    a11yFocusBoost.addEventListener("change", () => {
      a11ySettings.focusBoost = a11yFocusBoost.checked;
      localStorage.setItem("om-a11y-focus-boost", String(a11ySettings.focusBoost));
      applyA11ySettings();
    });

    a11yAnnounceCues.addEventListener("change", () => {
      a11ySettings.announceCues = a11yAnnounceCues.checked;
      localStorage.setItem("om-a11y-announce-cues", String(a11ySettings.announceCues));
    });

    a11ySyncVisualReplay.addEventListener("change", () => {
      a11ySettings.syncVisualReplay = a11ySyncVisualReplay.checked;
      localStorage.setItem("om-a11y-sync-visual-replay", String(a11ySettings.syncVisualReplay));
      if (!a11ySettings.syncVisualReplay) stopVisualReplay();
    });

    hapticsTestBtn.addEventListener("click", () => {
      if (!hapticsAvailable()) {
        setStatus("No haptics available on this platform.", "warn");
        announceScreenReader("No haptics available on this platform.");
        return;
      }
      const wasEnabled = a11ySettings.vibrate;
      a11ySettings.vibrate = true;
      hapticCue("marker");
      setTimeout(() => { hapticCue("reference_ok"); }, 420);
      setTimeout(() => {
        hapticCue("reference_bad");
        a11ySettings.vibrate = wasEnabled;
      }, 900);
      setStatus("Playing three test pulses: marker, acceptable, outside.");
      announceScreenReader("Playing three test pulses: marker, acceptable, outside.");
    });

    prefersDarkScheme.addEventListener("change", () => {
      if (a11ySettings.theme === "system") applyA11ySettings();
    });

    window.addEventListener("hashchange", () => {
      if (!importSharedTimingSettings()) return;
      if (pendingStatusMessage) {
        setStatus(pendingStatusMessage);
        announceScreenReader(pendingStatusMessage);
      }
    });

    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("scroll", syncViewportHeight);

    numberInputs.forEach((input) => {
      input.addEventListener("focus", () => {
        setTimeout(() => { input.select(); }, 0);
      });
    });

    const unlockAudio = () => {
      ensureAudioContext();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    shareTimingSettingsBtn.addEventListener("click", () => { copyShareTimingLink(); });

    copySetupTimingMessageBtn.addEventListener("click", async () => {
      if (!setupTimingMessage.value) {
        if (!validateSetup()) return;
        populateShareMessagePreviews();
      }
      await copyTextToClipboard(setupTimingMessage.value);
      setStatus("Copied the setup message.");
      announceScreenReader("Copied the setup message.");
    });

    copyPracticeTimingMessageBtn.addEventListener("click", async () => {
      if (!practiceTimingMessage.value) {
        if (!validateSetup()) return;
        populateShareMessagePreviews();
      }
      await copyTextToClipboard(practiceTimingMessage.value);
      setStatus("Copied the practice message.");
      announceScreenReader("Copied the practice message.");
    });

    /* ---------------- Boot ---------------- */
    syncViewportHeight();
    importSharedTimingSettings();
    applyStoredSelections();
    restoreStoredSettings();
    renderMarkers();
    updateNextPrompt();
    hapticsSupportNote.textContent = describeHapticsSupport();

    if (pendingStatusMessage) {
      setStatus(pendingStatusMessage);
      announceScreenReader(pendingStatusMessage);
    }

    // Offline support for the web/PWA build. Harmless inside the native shell,
    // where files are already local.
    if ("serviceWorker" in navigator && location.protocol !== "file:" && !isNativeShell) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { /* offline is best-effort */ });
      });
    }
