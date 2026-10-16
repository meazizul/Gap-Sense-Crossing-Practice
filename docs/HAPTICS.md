# Haptics & Vibration — Gap Sense: Crossing Practice

Everything about touch feedback: why it matters here, why iOS makes it hard, how
this app solves it, and how to verify it works.

---

## 1. Why haptics matter for this app

For a **DeafBlind** traveler, neither the audio cues nor the visual replay are
reachable. Vibration is the only channel left — which makes it the difference
between the app being usable and being useless for that group.

It also matters for everyone else. The moment a student taps **Mark**, they need
confirmation that the tap registered. Sound can be lost under traffic noise; a
pulse in the hand cannot.

---

## 2. The iOS problem

> **`navigator.vibrate()` does not exist in Safari on iOS. At all. In any mode.**

Apple has never implemented the W3C Vibration API, and that applies equally to:

- Safari,
- every other iOS browser (they are all WKWebView underneath),
- web apps added to the Home Screen ("Add to Home Screen" / PWA).

There is **no web workaround**. No permission to request, no fallback API, no
polyfill. A checkbox labeled "Vibrate on cue" in a web page on an iPhone does
nothing, silently.

Android browsers *do* support `navigator.vibrate()`, but only coarsely: on/off
patterns in milliseconds, with no control over intensity or sharpness.

### What this means in practice

| Platform | Web / Add-to-Home-Screen | Native app (this repo) |
|---|---|---|
| **iOS** | ❌ Nothing. Ever. | ✅ Full Taptic Engine |
| **Android** | ⚠️ On/off patterns only | ✅ (not yet configured) |
| **Desktop** | ❌ No hardware | — |

**This is the single strongest reason this project has a native iOS wrapper
rather than shipping as a web app only.**

---

## 3. How this app solves it

The app wraps its web UI in a [Capacitor](https://capacitorjs.com/) native shell.
Inside that shell, JavaScript can call native iOS code — including Core
Haptics, which drives the iPhone's Taptic Engine.

### The bridge

All touch feedback goes through one function, `hapticCue(type)`, in
`ios-app/www/js/engine.js`. It picks the best available backend at runtime:

```
hapticCue(type)
     │
     ├─ Native iOS app (build 7+)?          ──▶ GSNative plugin
     │                                           → one Core Haptics engine
     │
     ├─ Other native app (Android)?         ──▶ @capacitor/haptics
     │                                           → VibrationEffect
     │
     ├─ Browser with navigator.vibrate?     ──▶ Web Vibration API
     │                                           → coarse on/off (Android)
     │
     └─ Otherwise (iOS Safari, desktop)     ──▶ nothing, silently
```

This means **the same web code runs everywhere** and simply gets better
feedback when it happens to be running inside the native app. Nothing needs to be
conditionally compiled.

### The cue vocabulary

Each event type maps to a deliberately distinguishable sensation:

| Cue | When it fires | Native iOS (Gap Sense plugin) | Web fallback |
|---|---|---|---|
| `start` | Tapping **Begin**; each end of a sample warning time; the sound starting in *Comparison preparation*; detecting a vehicle | One medium tap | `[30]` ms |
| `ready` | Pressing **Ready** in *Comparison preparation* ("Get ready") | Two light taps, 95 ms apart | `[25, 70, 25]` |
| `marker` | Tapping **Mark**; your own tap in a replay; where your crossing time ends in a comparison replay | **One strong tap** | `[45]` ms |
| `reference_ok` | Within the margin, or a right answer | **Three strong taps**, 110 ms apart | `[35, 45, 35, 45, 35]` |
| `reference_bad` | Outside the margin, or a wrong answer | **One 450 ms buzz** (continuous, full intensity) | `[240]` |

The two replay cues are the important pair: a rhythm of three knocks versus one
long buzz several times longer than anything else, which is exactly the
"within / outside" distinction the app teaches, delivered through skin instead
of ears. Apple's "notification" haptics were tried first and were too subtle
through fabric or a glove; these are tuned for a hand in a pocket or holding a
cane. In the comparison replays the sample's two ends are medium taps and the
end of the crossing time is your own strong tap, so the direction and size of
the difference are felt the same way they are heard. Right or wrong is felt
straight after the answer, before the replay.

### Where it fires from

`hapticCue()` is called from `emitCue()`, the same function that drives the cue
banner and screen-reader announcements. So haptics, visuals, and speech all come
from one event stream and cannot fall out of sync with each other.

---

## 4. Turning it on (it is on by default)

Since build 4 (10 Oct 2026) **Vibrate on cue** is on from the first launch;
nobody has to find the switch. To check or change it:

1. Open **Accessibility** (person icon, top right).
2. Under **Touch feedback (haptics)**, **Vibrate on cue** should be ticked.
3. Read the note underneath — it always tells you which backend is live:

| Note text | Meaning |
|---|---|
| "Native haptics active. If you feel nothing, check iPhone Settings…" | ✅ iPhone app, Gap Sense haptics plugin |
| "Native vibration active…" | ✅ Android app |
| "Web vibration available. Patterns are coarse on/off only…" | ⚠️ Android browser |
| "No haptics on this browser. iOS Safari has never supported web vibration…" | ❌ Web on iOS, or desktop |

---

## 5. How to test it

### Quick test — the built-in button

**Accessibility → Test haptic pulse.** It fires all three sensations in sequence,
about 0.4s apart:

1. a **medium tap** (marker),
2. a **light double** (within tolerance),
3. a **heavy stutter** (outside tolerance).

Hold the phone loosely in your palm rather than gripping it — a tight grip damps
the Taptic Engine and makes the three feel more alike than they are.

**Pass:** three clearly different sensations.
**Fail:** nothing, or three identical buzzes.

### Full test — during a real practice run

1. Enable **Vibrate on cue**.
2. Set times (clear `4`, full `8`, margin `0.4`) and choose **Start → Halfway**.
3. Press **Begin**, wait, press **Mark**.
4. During replay, feel for the success/error pulse at the reference moment.

**To force an "outside" pulse:** tap Mark obviously late — several seconds past
the reference time.

### Testing without hearing anything

To confirm haptics work *on their own* — the DeafBlind case:

1. Accessibility → Output mode → **Visual only** (silences all audio).
2. Enable **Vibrate on cue**.
3. Run a practice.

Every event should still be felt. This is the configuration that matters most for
the app's hardest-to-serve users.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Nothing at all, in Safari on iPhone | Expected. iOS Safari has no vibration API. Install the native build. |
| Nothing at all, in the native app | Check **Vibrate on cue** is ticked (it is on by default, and build 7 switched it back on once for anyone who had an old "off" stored). Then check iOS **Settings → Accessibility → Touch → Vibration** and **Settings → Sounds & Haptics → System Haptics** are on. |
| Nothing in the simulator | Expected — simulators have no Taptic Engine. Use a real device. |
| All three test pulses feel identical | Usually grip. Hold the phone loosely. Also confirm the note says "Native haptics active". |
| Works on Android web, weak/undifferentiated | Expected. The Web Vibration API has no intensity control. |
| Haptics slightly out of step with the sound | Known limitation — see below. |

### iOS Low Power Mode
Low Power Mode can suppress or weaken haptics system-wide. If feedback disappears
unexpectedly, check the battery setting before debugging the app.

---

## 7. Known limitations

**Timing drift.** Audio cues are scheduled on the `AudioContext` clock, which does
not drift. Haptics are fired from `setTimeout`, which does — it is throttled under
CPU load and in background tabs. In normal use they agree closely; on a heavily
loaded device the pulse can lag the tone slightly. The proper fix is to drive
haptics from the same replay timeline that drives audio, which is a larger
refactor and is noted in the changelog as outstanding.

**Duration-shaped patterns.** From build 7 the iOS app plays every cue through
its own small plugin, `GSNativePlugin` in `ios-app/ios/App/App/GapSenseNative.swift`.
It keeps one Core Haptics engine (`CHHapticEngine`) for the life of the app,
set to play haptics only, so it never touches the audio session the sounds use.
Each cue is one `CHHapticPattern`, so the taps in a pattern are evenly spaced.
(The stock `@capacitor/haptics` plugin created a new engine for every long buzz
and let it be freed at once, and that engine shared the audio session.) A buzz
whose *length* encodes the *size* of the timing error is now possible with the
same engine; it is not built yet.

**Android.** The Android app uses `@capacitor/haptics`, which maps the same
calls to `VibrationEffect`. Android browsers use
`navigator.vibrate` with the patterns above. Amplitude shaping is not used yet.

---

## 8. For developers

**The relevant code** — in `ios-app/www/js/engine.js`, search for:

- `hapticCue` — the dispatcher
- `describeHapticsSupport` — the text shown under the test button
- `WEB_VIBRATION_PATTERNS` — the web fallback patterns
- `emitCue` — the single event stream that calls it from Practice
- `gsHapticAt` in `js/comparison.js` — timed pulses for the comparison
  replays, tracked so a cancelled flow clears them
- `GSHaptics` in `ios-app/ios/App/App/GapSenseNative.swift` — the iOS patterns

**To add a new haptic cue:**

1. Add the cue type to the `messages` map in `emitCue()`.
2. Add a native mapping in `hapticCue()`, and a pattern in `GSHaptics.events(for:)`
   for iOS.
3. Add a web fallback pattern to `WEB_VIBRATION_PATTERNS`.
4. Run `npx cap copy ios && npx cap copy android` and rebuild.

**Plugins:** iOS uses `GSNativePlugin`, registered in code by
`MainViewController.capacitorDidLoad()` (the storyboard's root view
controller). [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics)
stays installed as the fallback and for Android.
