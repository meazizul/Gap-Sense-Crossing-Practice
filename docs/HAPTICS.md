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
Inside that shell, JavaScript can call native iOS code — including
`UIFeedbackGenerator`, which drives the iPhone's Taptic Engine.

### The bridge

All touch feedback goes through one function, `hapticCue(type)`, in
`ios-app/www/index.html`. It picks the best available backend at runtime:

```
hapticCue(type)
     │
     ├─ Running inside the native iOS app?  ──▶ @capacitor/haptics
     │                                           → real Taptic Engine
     │
     ├─ Browser with navigator.vibrate?     ──▶ Web Vibration API
     │                                           → coarse on/off (Android)
     │
     └─ Otherwise (iOS Safari, desktop)     ──▶ nothing, silently
```

This means **the same `index.html` file runs everywhere** and simply gets better
feedback when it happens to be running inside the native app. Nothing needs to be
conditionally compiled.

### The cue vocabulary

Each event type maps to a deliberately distinguishable sensation:

| Cue | When it fires | Native iOS | Web fallback |
|---|---|---|---|
| `start` | Tapping **Begin** | Light impact | `[25]` ms |
| `marker` | Tapping **Mark** | **Medium impact** | `[40]` ms |
| `reference_ok` | Replay: within tolerance | Success notification (light double-tap) | `[30, 30, 30]` |
| `reference_bad` | Replay: outside tolerance | Error notification (heavy stutter) | `[120]` |

The two replay cues are the important pair. Apple's `SUCCESS` and `ERROR`
notification haptics feel categorically different — a crisp double versus a heavy
stutter — which is exactly the "within / outside" distinction the app teaches,
delivered through skin instead of ears.

### Where it fires from

`hapticCue()` is called from `emitCue()`, the same function that drives the cue
banner and screen-reader announcements. So haptics, visuals, and speech all come
from one event stream and cannot fall out of sync with each other.

---

## 4. Turning it on

1. Open **Accessibility** (person icon, top right).
2. Under **Touch feedback (haptics)**, tick **Vibrate on cue**.
3. Read the note underneath — it always tells you which backend is live:

| Note text | Meaning |
|---|---|
| "Native haptics active — this build drives the iPhone Taptic Engine directly." | ✅ Native app, everything works |
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
| Nothing at all, in the native app | Check **Vibrate on cue** is ticked. Then check iOS **Settings → Sounds & Haptics → System Haptics** is on. |
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

**No intensity envelopes.** `@capacitor/haptics` exposes discrete impact and
notification styles, not continuous control. Richer, duration-shaped patterns —
where the *length* of a buzz encodes the *size* of the timing error, which would
suit this app's "feedback as felt duration" principle exactly — require iOS
**Core Haptics** (`CHHapticEngine`) via a small custom plugin. This is the most
promising next step for the DeafBlind use case.

**Android not configured.** The bridge already falls back to `navigator.vibrate`,
so Android web works today. A native Android build (`npx cap add android`) would
map to `VibrationEffect` and gain amplitude control, but has not been set up.

---

## 8. For developers

**The relevant code** — in `ios-app/www/index.html`, search for:

- `hapticCue` — the dispatcher
- `describeHapticsSupport` — the text shown under the test button
- `WEB_VIBRATION_PATTERNS` — the web fallback patterns
- `emitCue` — the single event stream that calls it

**To add a new haptic cue:**

1. Add the cue type to the `messages` map in `emitCue()`.
2. Add a native mapping in `hapticCue()`.
3. Add a web fallback pattern to `WEB_VIBRATION_PATTERNS`.
4. Run `npx cap copy ios` and rebuild.

**Plugin:** [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics).
Already installed and registered — `packageClassList` in
`ios-app/ios/App/App/capacitor.config.json` lists `HapticsPlugin`.
