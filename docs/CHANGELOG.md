# Changelog — Gap Sense: Crossing Practice

What changed, why, and when. Newest first.

The original project was not under version control (it arrived as a ZIP export),
so dates before this file existed were reconstructed from file timestamps rather
than commit history. They are accurate to the day.

---

## 2026-09-27 — The rest of the training sequence

Until now the app covered one activity: practising your crossing time. The
feature proposal describes four, and a meeting with Cindi confirmed a step was
missing *before* the one that existed. All four now ship.

### The missing first step: Measure my crossing

The app used to *begin* from two numbers an instructor measured with a stopwatch
and typed into Settings — the one place the whole method still depended on
counting seconds, and the reason a student could never set themselves up at a new
street alone. There is now a mode that walks the crossing: tap at each point,
repeat, and the app averages the walks, warns if they are inconsistent, plays the
duration back so the felt sense starts immediately, and saves it as the reference.

### Practice Comparison Task

The app plays a gap representing a vehicle's warning time; the student judges it
longer, shorter, or about the same as their crossing. Categories are drawn evenly
so no base rate can be learned, and magnitudes scale with the crossing time.
A wrong answer replays the gap and the crossing time back to back so the error is
felt. An optional follow-up asks the student to tap out *how much* longer or
shorter. The gap can be one continuous sound or two taps with silence between,
because which reads better is genuinely unresolved.

### Actual Comparison Task — at the street

Direction set first (left compares to half street, right to full), then one large
button: tap on detection, tap again as the vehicle passes. Cancel discards a
vehicle that turned off. **Ambient noise sampling** records a 3-second median
baseline of "quiet"; any measurement started more than 6 dB above it is flagged,
because a warning time heard over a running engine is not one to rely on. Audio is
analysed on-device, never recorded or transmitted.

### Adaptive margin of error

Cindi asked for help with the mathematics. Implemented as behavioural shaping over
a rolling window of 10 attempts: **× 0.85 per step** when accuracy is ≥ 80%, hold
between 60–80%, step back to the last successful margin below 60%. Geometric so
each tightening is proportionally the same challenge; from 0.40 s it takes about
nine successful windows to reach the 0.10 s floor. Two successive failures pin a
learner floor at the last margin they held, which an instructor can clear.

### Progress and instructor reporting

Every attempt is logged on the device. A Progress screen shows accuracy per
activity and a strip of recent attempts. A plain-text report can be generated and
copied for the instructor — shown in full to the student first, never sent
automatically, with a one-tap delete for all history.

### Help and first-run tutorial

Separate guidance for clients and instructors, plus a tutorial that runs on first
launch and plays each sound with an explanation of what it means.

### Refactor

The single 3,137-line `index.html` was split into `index.html` (markup),
`css/app.css`, and five JavaScript modules. Still no build step. This was
necessary — the new work would have pushed one file past 5,000 lines.

### Environment

Xcode's update raised the minimum iOS deployment target from 14.0 to 15.0,
breaking the build. Fixed in the Podfile, the Xcode project, and with a
`post_install` hook that forces every Capacitor pod to the same minimum. Note the
simulator is currently unusable on this machine — CoreSimulator is older than the
installed build and needs a reboot — so this build was verified by compiling
against the device SDK and by full functional testing in the browser.

---

## 2026-08-15 — Native iOS app, redesigned interface, project rename

### Renamed to "Gap Sense — Crossing Practice"

The project previously carried three different names at once: the page title said
"O&M Timing Practice Prototype", social metadata said "Street Timing Practice",
the repository was "Streets", and the on-screen heading said "Uncontrolled
Crossings". Settled on one name across the whole project.

| Context | Value |
|---|---|
| Full name | Gap Sense — Crossing Practice |
| Home-screen label / heading | Gap Sense (iOS truncates long labels) |
| Page subtitle | Crossing Practice |
| iOS bundle identifier | `com.gapsense.crossingpractice` |
| npm package | `gap-sense-crossing-practice` |

`REPO_ANALYSIS.md`, `CHANGES_REPORT.md`, and `RESEARCH.md` were deliberately
**not** rewritten — they are dated historical records and still use the old
working titles.

### New: native iOS application (`ios-app/`)

Wrapped the app in a [Capacitor](https://capacitorjs.com/) shell, giving a real
iOS application that installs on a phone. Verified: `** BUILD SUCCEEDED **`,
installed and launched on an iPhone 17 simulator running iOS 26.5.

**Why native rather than a web app:** `navigator.vibrate()` does not exist in
Safari on iOS and never has. For a DeafBlind user, vibration is the only feedback
channel available — so a web-only build cannot serve them at all. See
[`HAPTICS.md`](HAPTICS.md).

Added:
- **Real Taptic Engine haptics** via `@capacitor/haptics`, with automatic
  fallback to the Web Vibration API on Android and silent degradation elsewhere.
  A **Test haptic pulse** button and a live backend-detection note were added to
  the Accessibility panel.
- **Audio that survives the ringer switch.** Configured `AVAudioSession` to the
  `.playback` category in `AppDelegate.swift`. By default a WKWebView uses the
  `ambient` session, which the hardware silent switch mutes — a student at a
  corner with the switch flipped would have heard nothing and had no way to know
  why. `.mixWithOthers` keeps VoiceOver speech working alongside.
- **PWA support** — web manifest, service worker for offline use, generated app
  icons and a launch image.
- **`serve-lan.mjs`** — a dev server that prints a phone-reachable Wi-Fi address,
  so the app can be tested on a real iPhone without Xcode.

### Redesigned interface

Rebuilt the presentation layer. The timing engine, the AudioContext-clock replay
synchronization, the tuned sound presets, and the feedback-as-duration behavior
were carried over **unchanged**.

- Header with brand mark, card-based sections, segmented mode picker, progress
  chips, and a large gradient action button.
- **Stage identity is encoded four independent ways** — color, corner radius,
  border style, and symbol — so it is never carried by color alone.
- Every accent color verified at **≥4.5:1** contrast against the text on it, in
  all four themes. Gradients run dark→mid rather than dark→bright so white text
  stays legible across the whole sweep.
- High-contrast and inverted themes flatten every gradient.
- Large-text mode reflows the header, mode picker, and marker row to single
  columns at 130% and above.

### Three bugs fixed

1. **The marker cue banner was unreadable.** `emitCue("marker", …)` set the
   banner text, then `updateNextPrompt()` overwrote it on the very next
   statement. Both facts now live in one message: *"Halfway marked. Press Mark for
   Finish."*

2. **The progress-marker summary never reached screen readers.**
   `updateMarkersSummary()` carefully computed an `aria-label` such as "Progress
   markers: Start complete, Halfway current" — and set it on an element carrying
   `aria-hidden="true"`, which discarded it. Now `role="img"` plus `aria-label`,
   making the row one announceable unit.

3. **Feedback classification was computed twice.** `beginReplay()` calculated the
   margin/latency/epsilon comparison once for the audio schedule and again for the
   visual event list. If either copy were tuned, sound and visuals would silently
   disagree about what counted as acceptable. Now a single `classifyMark()` drives
   audio, visuals, cues, and haptics.

Also removed two functions (`showUserVisualPulse`, `showReferenceVisualPulse`)
that were defined but never called, and consolidated the duplicated
`getReferenceTimes` / `getReferenceTimesForMode` pair.

### Documentation

Added `docs/APP_GUIDE.md`, `docs/TESTING.md`, `docs/HAPTICS.md`, this changelog,
and `ios-app/README-IOS.md`. Rewrote the root `README.md` as a reviewer entry
point.

### Environment notes

Three toolchain blockers were resolved to get the iOS build running, recorded
because they are easy to hit again:

1. **CocoaPods** was not installed → `brew install cocoapods`.
2. **Xcode had never completed first-launch setup**, so *every* `xcodebuild`
   invocation failed with `failed to load a required plug-in` →
   `xcodebuild -runFirstLaunch` (does not need `sudo`).
3. **The iOS platform was not installed.** Misleadingly, `xcodebuild -showsdks`
   *did* list "iOS 26.5" — the SDK was present but the device-support platform was
   not, which Xcode 15+ splits into a separate 8.5 GB download →
   `xcodebuild -downloadPlatform iOS`.

---

## 2026-07-08 — Fix pass

Full detail in [`../CHANGES_REPORT.md`](../CHANGES_REPORT.md). Summary:

- **Audio clarity.** `TEST_TUNING` had shipped with all four volume multipliers
  at the debug maximum of `2`, so feedback tones ran at gain 4× and the "outside"
  pulse peaked around 4.3× full scale — hard-clipped into distortion, which is
  why it sounded quieter and mushier rather than louder. Volumes reset to 1
  (0.8 for the button chime), every preset renormalized to a partial-gain sum
  ≤0.80, and a `DynamicsCompressorNode` master limiter added.
  The outside pulses were rebuilt: **240–260 Hz → 294–349 Hz** (small phone
  speakers roll off below ~300 Hz, so the old cue was partly lost inside the
  speaker), duration **0.12s → 0.30s**, and built from two closely spaced
  frequencies that beat against each other for a rough texture.
- **Dead marker cue.** `emitCue()` defined a `marker` cue with a vibration
  pattern that no call site ever fired — so with vibration enabled, tapping Mark
  did nothing. Fixed.
- **Dark-mode contrast** (issue `uc-3qz`). White on the dark theme's `#64d3bf`
  accent measured ~1.8:1, a hard WCAG failure. Added a per-theme `--on-accent`
  variable.
- **Forced-light invisible text.** Choosing Light while the OS was in dark mode
  rendered several buttons as white-on-white. Fixed with explicit `color-scheme`
  per theme.
- **Accessibility.** Added the first `<h1>` the page ever had; converted five
  unlabelled radio clusters to `<fieldset>`/`<legend>`.
- **Dead code removed.** A mute flag with no UI, the entire SFXR sound path
  (dead at both ends — no engine file, no data), a permanently hidden status
  element, and an unused npm dependency. 3,367 → 3,271 lines.
- **Documentation honesty.** The README had described a Next.js directory
  structure that does not exist in this repository. Rewritten.

---

## 2026-06-10 — Repository audit

No code changed. Full audit in [`../REPO_ANALYSIS.md`](../REPO_ANALYSIS.md),
covering correctness, accessibility readiness, PWA-versus-native tradeoffs, and a
prioritized improvement list. Most of the 2026-07-08 and 2026-08-15 work comes
directly from its recommendations.

---

## Before 2026-06-10

Original prototype development. Not under version control; no history available.
Preserved unmodified at `../index.html` apart from the rename.

---

## Outstanding

Known and deliberately not done yet:

- **No attempt history.** Results are discarded on reset, blocking both an
  adaptive margin-of-error feature and any data export for instructors.
- **Two timing systems coexist.** Audio runs on the drift-free `AudioContext`
  clock; UI stage changes and haptics use `setTimeout`. On a loaded device they
  can drift apart slightly. The fix is to drive everything from the replay
  timeline.
- **No automated tests.** The pure functions — token encode/decode, reference-time
  calculation, `classifyMark`, text-size scaling — are trivially unit-testable and
  are the safety-critical logic.
- **No VoiceOver/TalkBack device pass** (issue `uc-j9n`), including the open
  question of whether VoiceOver's double-tap-to-activate latency degrades marking
  accuracy.
- **Core Haptics** for intensity-shaped patterns, where buzz length would encode
  error size.
- **Android** is not configured.
- **Not on the App Store.**
