# Changelog — Gap Sense: Crossing Practice

What changed, why, and when. Newest first.

The original project was not under version control (it arrived as a ZIP export),
so dates before this file existed were reconstructed from file timestamps rather
than commit history. They are accurate to the day.

---

## 2026-10-16 (build 7: iOS, Android, web) — Second round of O&M feedback

A second detailed review by Cindi Lashinsky (O&M Specialist), with input from
Dona Sauerburger on the at-the-street procedure. Every point is addressed below.
The same code runs on all three: iOS build 7, Android versionCode 7, and the web
page.

**Names and wording**

- "Practise my timing" is now **Practice my timing**. "Time it from a signal"
  is now **Comparison preparation**: to an O&M Specialist, "signal" means a
  traffic signal, and this app is about uncontrolled crossings. "Compare
  practice" is now **Comparison practice**.
- American English throughout (practice, curb, traveler, judgment).
- New task descriptions on Home, written by Cindi.
- The app name ("Gap Sense") is kept for now. It is under discussion, because
  "gap" means the time between vehicles in published work. The name is held in
  one place in the code so a rename is a small change.

**Use with an O&M Specialist**

- A first-run notice: the app is for use under the guidance of an Orientation
  and Mobility Specialist, is not a replacement for instruction, and does not
  cover all the skills needed to cross streets. It cannot be skipped with
  Escape and is shown on first run even from the conference link. Home carries
  the same line permanently. Help can show it again.
- On Comparison practice and At the street: **"Longer does not mean long
  enough."** A longer warning time is not, by itself, enough to cross. Shown
  until the student hides it; Help brings it back.

**Instructor setup (new screen)**

- Crossing times, margin, instructor email and student code moved here from
  Settings.
- The instructor chooses which activities the student sees, which Practice
  modes are offered, and for each option: on, off, or student chooses. Options
  the instructor fixes are hidden from the student, with a short note.
- Optional instructor code (digits) so a student cannot change the setup. It
  locks again on leaving the screen.

**Setup link and report**

- The setup link (version 3) can carry any of: crossing times and margin,
  instructor email and student code, and the activities and options chosen.
  The instructor ticks what to include. Version 1 and 2 links still work.
- **Share the setup link** opens the phone's share sheet. **Text it to the
  student** opens Messages with the message filled in; the instructor adds
  the number.
- Links made inside the installed app point at the public web address, never
  at the app's internal address.
- After a browser applies a setup, it offers **Open in the Gap Sense app**,
  which hands the same setup to the installed app through a `gapsense://` link.
- **Send my progress to my instructor**: the student sees the report, presses
  **Send it**, and chooses Messages, Mail or any app. No copy and paste, no
  Mail setup needed, and no server.

**Comparison preparation**

- Pressing Ready says **"Get ready"** out loud (and two light taps), instead of
  a beep that sounded like the other cues.
- The sound can be the same steady sound used in Comparison practice, playing
  until the student stops it, like hearing a vehicle and deciding "now I would
  finish crossing". Or one short beep, then silence. Instructor or student
  chooses.
- Wait times mix quick (0.7–2 s), medium (2–5 s) and long (5–10 s), never the
  same band three times in a row.
- If nobody presses, the sound stops by itself and nothing is recorded.

**Comparison practice**

- The sample is **one steady sound at one loudness**, with no fade in or out,
  so a student with any hearing loss hears all of it. Loudness defaults to
  100%. A **pitch** control (lowest to high) is shared with Comparison
  preparation.
- Answers open a **full-screen swipe pad** that never scrolls the page: swipe up
  for longer, down for shorter, tap for about the same. Three large buttons sit
  on the pad for VoiceOver and TalkBack users, with focus on the middle one.
  The instructor can choose buttons only.
- Right or wrong is given at once on every channel: the chime or the low pulse,
  the haptic pattern, and, with visual on, the circle or the triangle.
- The replay no longer plays a right/wrong cue at the crossing time. It plays
  the sample, and the student's own "this is your time" sound and flash where
  their crossing time ends.
- **How much longer or shorter** is offered only after a correct "longer" or
  "shorter" answer.
- Two replays after "how much", chosen by the instructor: (a) combined, Cindi's
  design: a steady sound for the crossing time, the right or wrong sound where
  the sample ended, and the student's sound at the crossing time plus or minus
  their estimate; or (b) like Practice my timing.
- The sample on screen is a held bar, distinct from the student's own flash.

**At the street (reworked with Cindi and Dona)**

- The background-noise check is gone, and with it all microphone use and the
  microphone permission on iOS and Android. Accuracy depended on how the phone
  was held, and judging conditions is taught by the instructor.
- New wording: position yourself as directed by your O&M Specialist; tap when
  you *think* you detect (see or hear) a vehicle.
- The student marks **hearing or vision**; it is saved with each vehicle.
- A full-screen pad: **swipe left or right** toward the side the vehicle comes
  from (left compares with the first half of the street, right with the full
  street), **tap** when it passes in front of you, **swipe down** if it never
  came. Buttons do the same for screen reader users.
- After arrival the **student judges** longer, shorter or about the same. The
  app does not give the answer first. "How much" follows a correct
  longer/shorter answer if switched on.
- Replays: after every vehicle, only after a wrong answer, or never (then only
  the right or wrong sound).
- Reports show direction, hearing or vision, the judgment, and vehicles that
  never came. Only judged vehicles count towards a score.

**Accessibility**

- **Self-voicing**: the app can speak its own directions and results, with a
  speaking rate, for students still learning VoiceOver or TalkBack. Speech
  stops whenever a sound is being timed.
- Home activities are single buttons whose name is the title and the
  description, so VoiceOver reads one item per activity. The hidden "Home"
  heading is gone; focus moves to the visible screen title on every screen.
- **Siri**: "Practice my timing in Gap Sense", "Comparison preparation in Gap
  Sense", "Comparison practice in Gap Sense", "At the street in Gap Sense" work
  with no setup, and appear in the Shortcuts app. A **Siri and shortcuts**
  screen explains them. On Android, touch and hold the app icon for the same
  four shortcuts.

**Haptics and sound on iPhone**

- A small Gap Sense plugin now plays every haptic cue through one long-lived
  Core Haptics engine that plays haptics only and never touches audio. The
  stock plugin built a new engine for every long buzz, freed it at once, and
  shared the audio session with the web view.
- Vibration is switched back on, once, for anyone upgrading with an old "off"
  stored from an early build. Turning it off again from build 7 is respected.
- The sound engine now resumes after iOS interrupts it (a call, Siri, another
  app). Before, one interruption could leave the app silent until relaunch.
- The installed app tells WebKit it is a playback app, so the ringer switch
  does not mute it. The silent-audio workaround now runs only on iOS 16.
- Accessibility has a **Play a test sound** button that also reports the state
  of the sound engine.

**Tests**

- The browser test suite grew from 42 to 74 tests, covering every change above.
  The iOS build was launched in the iOS 27 simulator on an iPhone 14 Pro Max
  with a built-in self-check (plugins present, sound running in playback mode,
  speech available, Siri path opening the right screen). The Android build was
  launched on an Android 15 emulator, with a `gapsense://` link and the four
  launcher shortcuts checked.

## 2026-10-14 (iOS build 6) — Hardened for every iPhone and iPad a participant might bring

After the iOS 27 crash, the native shell was audited for anything else that
could stop the app opening on a participant's phone.

- **Minimum iOS pinned to 16.0.** It was left to Xcode, which silently chose
  iOS 17, so anyone on iOS 16 (iPhone 8, 8 Plus, X) could not install it. The
  web code was checked against iOS 16 WebKit: everything it uses is supported
  from iOS 15.4, and the one newer CSS feature already had a fallback.
- **Device requirement corrected** from `armv7` (a 32-bit leftover in the
  template) to `arm64`.
- **Launch tested in the simulator** on 11 models on iOS 27 (iPhone SE 2nd
  and 3rd generation, 11, 13 mini, 14 Pro Max, 16e, 17 Pro Max, Air, iPad
  A16, iPad mini, iPad Pro 13-inch) and 7 models each on iOS 26.0 and 26.4:
  first launch, a second cold launch, and background then foreground, with
  no crash reports and the home screen rendered.
- Checked that the app package contains every web file and Capacitor's
  bridge scripts, whose absence is the only other way Capacitor aborts at
  launch.

Apple does not provide iOS 16, 17 or 18 simulators for the current Xcode, so
those versions are covered by the build settings and the web-feature check
rather than a simulated launch.

## 2026-10-14 (iOS build 5) — Launch crash on iOS 27 fixed

A tester on an iPhone 14 Pro Max running iOS 27.0.1 reported "crashes as soon
as I try to open it". The TestFlight crash log shows an `EXC_BREAKPOINT` on
the main thread inside UIKit's `EvaluateRuntimeIssueForNoSceneLifecycleAdoption`
during scene creation. On iOS 27, an app built with the current SDK that has
not adopted the UIScene lifecycle is terminated at launch. The Capacitor shell
still used the app-delegate-only lifecycle, so every launch on iOS 27 died
before the web view existed. Devices on iOS 26 were unaffected, which is why
it passed device checks here. Reproduced in the iOS 27.0 simulator, where the
same frame appeared within a second of launch.

Fix: `Info.plist` declares a `UIApplicationSceneManifest` (single scene, the
existing `Main` storyboard), and `AppDelegate.swift` gains the scene
configuration hook and a `SceneDelegate` that forwards URL opens and user
activities to Capacitor. No web code changed; Android is unaffected.

## 2026-10-10 (build 4) — Vibration on by default, no zoom trap, visible build number

Found by the user on TestFlight build 3 within minutes of it going live.

- **Vibration is on from the first launch.** It was off until someone found the
  switch under Accessibility. For a DeafBlind user it is the whole interface,
  so the default is now on; an explicit opt-out is still remembered.
- **Double-tap no longer zooms the iPhone app.** A double tap anywhere zoomed
  the web view and there was no way back except relaunching. The native shell
  now locks the viewport (WKWebView honours `user-scalable=no`; Safari does
  not, so the web build is untouched and still pinch-zooms), and
  `touch-action: manipulation` on the page removes double-tap zoom everywhere
  while keeping pinch. Capacitor's `zoomEnabled` is set to false as well.
- **Help → About shows the version and build**, read from the app bundle in
  the native apps ("Gap Sense version 1.0, build 4 (iPhone app)"), so a tester
  can confirm which build they are running. TestFlight itself only shows
  "1.0" prominently.
- iOS build 4, Android versionCode 4, service-worker cache v6. 41 browser tests.

---

## 2026-10-10 — Cindi's review: measuring removed, a signal activity, overlapped replays, privacy in the share link

Cindi reviewed the four activities in detail on 7 October. Everything below
follows from that review and from a code review the same week. All three bugs
she reported were real.

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
