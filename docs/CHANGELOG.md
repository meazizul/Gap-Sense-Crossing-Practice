# Changelog — Gap Sense: Crossing Practice

What changed, why, and when. Newest first.

The original project was not under version control (it arrived as a ZIP export),
so dates before this file existed were reconstructed from file timestamps rather
than commit history. They are accurate to the day.

---

## 2026-10-10 — Cindi's review: measuring removed, a signal activity, overlapped replays, privacy in the share link

Cindi reviewed the four activities in detail on 7 October (tracked changes on
the 29 September email) and copied Dona. Everything below follows from that
review and from a code review the same week. All three bugs she reported were
real.

### Measure my crossing is gone

She was clear: determining the crossing time is the instructor's job. They time
at least three crossings and use the **longest** ("if it took that long once, it
may take that long another time"), and the start, halfway and finish points are
chosen precisely, not by a student pressing buttons while crossing. The step,
its screen and `measure.js` were removed. Settings now says who sets the times
and how; the Home screen points a new user to Settings or to the instructor's
link. Home has four steps again: Practise, Time it from a signal, Compare, At
the street.

### New: Time it from a signal

The first step of her proposed comparison structure: judging time when you do
*not* control the start, the way she teaches at the kerb ("you hear a car
coming… wait… now"). Press **Ready**; after a random wait (1.5–4 s, or 3–8 s
with "Longer waits") the signal comes — two quick blips, a pulse, a flash — and
the student presses when their crossing time is up. Then an overlapped replay,
exactly as in Practice. A press before the signal is a false start and records
nothing. Logged as its own activity with its own progress and margin lane.

### Practice: three bugs fixed

Practice never wrote to the attempt log, so nothing reached the Progress page,
there was no score line, and the adaptive margin could not apply to it. It now
logs every mark (Halfway → first-half lane, Finish → full-street lane), shows
"Last N: X within margin · margin …" under the button, and classifies against
the per-lane margin. The first tone could also land late on the very first
press: the audio engine was created suspended and the first tap waited for it to
resume. It is now created at load and warmed on the first touch.

### Compare practice, rebuilt around "sample warning time"

- **Words.** A gap is the interval between vehicles. What the app plays is a
  **sample warning time**: from first hearing a vehicle until it passes. The
  button is **Play a sample warning time**; "gap" is gone from the interface.
- **Nothing auto-advances.** A new trial used to start by itself 1.4 s after a
  correct answer. The student now presses Play for each one.
- **Overlapped replay, after every answer.** The old replay played the sample
  and then the crossing time back to back, and marked the crossing with the
  within-margin chime at both ends — so a wrong answer ended with two "you were
  close" sounds, the confusing "duplicated sounds" she heard. Now the sample and
  the real crossing time start together, as in Practice: a marker at the start,
  the sample, a marker where it ends, and the feedback cue where the crossing
  time ends (chime if within the margin, low pulse if not). The order of the
  last two sounds is the direction; the distance between them is the magnitude.
  Sight and touch follow the same timeline.
- **The sound of a vehicle.** The continuous sample now grows from quiet to
  loud and stops dead, instead of a steady tone that faded ("the opposite of
  vehicles"). A **Sample loudness** slider with a two-second preview sets where
  the quiet start becomes audible. Two taps with silence between remain an
  option.
- **Answering quickly.** Besides the three buttons, an answer pad takes a swipe
  up for longer, a swipe down for shorter, a tap for about the same (arrow keys
  on a keyboard). Under VoiceOver or TalkBack a web page cannot receive raw
  swipes, so focus lands on **About the same** when answers open; one flick
  reaches either other answer.
- **Random pause** before the sample (optional), and the **how much** step now
  runs before the replay, as she sketched: tap out the difference, hear the
  comparison replay, then your estimate against the real difference.
- Replays now hold a flash for the whole sample and show the acceptable or
  outside shape at the crossing time, so Deaf users see the comparison too.

### At the street

Direction labels now read "Approaching from the left — compared with the first
half of the street" and "from the right — compared with the full street"; the
mapping was right, the words were not. The verdict is followed by the overlapped
replay. The **background-noise check is experimental and off by default**: she
doubts it survives real phones, pockets and hands. The microphone is opened only
while the check is on and the screen is showing, and is released on leaving —
previously it could stay open if the user left before the permission prompt
resolved.

### Adaptive margin: experimental, per task, slower, never pinned

Her longest note: no research supports the window, the step or the stopping
rule; the first version "pinned the learner down" and tightened too fast. The
feature is now marked experimental and off by default, with a margin **per
activity and street type**. It tightens by × 0.92 once per **block of ten**
attempts at ≥ 80% (the old code re-evaluated after every attempt once ten
existed, which is why it felt fast), holds between 60 and 80%, and on a block
below 60% goes **straight back to the instructor's margin**. The learner floor
is gone; **Reset adaptive margins** in Progress starts every lane again.

### Share link and report: a code, never a name

The link travels by plain email or text. The student name field is gone. Settings
has **Instructor email** and a **Client code** (letters and digits, up to 8);
both ride in the version-2 link and the code heads the report. Old version-1
links still import. Progress gained **Email it to my instructor**, which opens
the phone's mail app with the report filled in; the student still presses Send.
Live vehicles in the report are described as verdicts (enough / not enough
warning), not as "incorrect" answers.

### Smaller fixes

- Screen-reader announcements are spoken immediately. The old announcer waited
  20 ms and re-checked a suppression flag, so any message followed by a replay —
  including the correct answer in Compare — was never spoken.
- Leaving a screen mid-activity now cancels it: Settings no longer stays
  disabled after backing out of Practice, no timers keep running, speech is
  un-suppressed, the microphone closes.
- Home shows "Crossing times set" rather than the numbers; the numbers live in
  Settings, so a student is not invited to count.
- Dark theme: the completed marker glyph was white on light green (~1.9:1); it
  uses dark ink now. The action-button hint is at full opacity. Copy buttons are
  44 px.
- The silent-switch keep-alive runs only in the installed app, where it belongs;
  in Safari it would have silenced the user's own music.
- Settings copy: "Measured and set by the O&M instructor…"; margin: "Chosen and
  set by the instructor. 0.50 s has historically been taught; there is no
  research yet on the right value." Default stays 0.40 s.
- Tutorial gained "A sample warning time" and "The start signal".

### Engineering

- **Browser tests.** `cd ios-app && npm test` runs 38 Playwright tests in the
  installed Google Chrome: every screen and dialog, the demo link, Practice
  logging and margins, leaving mid-run, announcements, Compare (no auto-advance,
  replay, swipe and keys, how much, random pause, cancel), the signal activity,
  At the street (verdicts, microphone closed, noise check on/off, the permission
  race), share link v2 and rejection of bad links, the report, deleting data,
  the adaptive maths, and the visual-only / 300% / high-contrast / reduced-motion
  configuration. Not covered: real audio, haptics, VoiceOver.
- `npm run sync` syncs iOS and Android. Service-worker cache `gapsense-v5`.
  iOS build 3, Android versionCode 3. `signal.js` added, `measure.js` removed.

---

## 2026-10-09 — App-bar header, build 2

The header became a sticky app bar with a back button, the screen title and the
Settings and Accessibility icons. iOS build number 2; Android released as
`v1.0-build2`.

---

## 2026-10-05 — Edge to edge on iOS, stronger haptics, silent switch

White bands above and below the web view are gone (edge-to-edge web view, dark
first paint). Haptics strengthened: heavy knock for a tap, three heavy knocks
within the margin, a 450 ms Core Haptics buzz outside it. A looping silent clip
moves WebKit to a playback audio session so tones play with the silent switch
on. `ENABLE_USER_SCRIPT_SANDBOXING=NO` so the CocoaPods embed script runs under
Xcode 27.

---

## 2026-09-28 — Replay haptics for DeafBlind users; Android project

During replay the app vibrated at the reference moment but not at the student's
own tap, so someone relying on touch alone felt one pulse with nothing to compare
it against. Both now pulse. The native Android project was added under
`ios-app/android/`.

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

- **No VoiceOver/TalkBack device pass**, including the open question of whether
  VoiceOver's double-tap-to-activate latency degrades marking accuracy, and
  whether focus-on-the-middle-answer is quick enough in Compare.
- **No roadside sound check.** The cues and the rising sample have only been
  heard through laptop and phone speakers indoors.
- **Two timing systems coexist.** Audio runs on the drift-free `AudioContext`
  clock; UI stage changes and haptics use `setTimeout`. On a loaded device they
  can drift apart slightly. The fix is to drive everything from the replay
  timeline.
- **Core Haptics** for intensity-shaped patterns, where buzz length would encode
  error size.
- **Cindi's fourth comparison step** is not yet specified.
- **Not on the App Store or Play Store.**
