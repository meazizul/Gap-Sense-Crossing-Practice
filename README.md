# Gap Sense — Crossing Practice

An **Orientation & Mobility (O&M)** training tool that helps blind and low-vision
travelers build a felt, intuitive sense of how long it takes them to cross a
street.

The core design principle: feedback is delivered as **felt duration** — sounds,
visual flashes, and vibration — **never as a number of seconds**. The student
learns the *feel* of the gap, not a stopwatch reading.

---

## Install on a phone

- **iPhone:** open <https://testflight.apple.com/join/wYreYpF6> on the phone (TestFlight). About two minutes.
- **Android:** download the APK from <https://github.com/meazizul/Gap-Sense-Crossing-Practice/releases/download/v1.0-build2/GapSense-android-debug.apk> and open it on the phone. Steps in `docs/INSTALL_GUIDE.md`.
- **Any browser:** open `index.html` or the hosted page. Everything works except vibration.

## For reviewers: the 60-second version

**What it does.** The student sets two reference times (how long to clear the
near lane, and to cross the full street). They then tap one large button as they
walk: once when they step off, again at each waypoint. The app replays their taps
against the reference times, sounding a bright chime where they were within
tolerance and a low buzzing pulse where they were not — so the *timing error is
heard as rhythm*, not read as a number.

**How to try it right now,** in order of effort:

| | Effort | What you need | What you get |
|---|---|---|---|
| **1** | 10 seconds | Any browser | Open [`ios-app/www/index.html`](ios-app/www/index.html) directly, or run a static server (below) |
| **2** | 2 minutes | An iPhone on the same Wi-Fi | Real phone install via Safari → Add to Home Screen |
| **3** | ~15 minutes | A Mac with Xcode + an Apple ID | The native iOS app, with real Taptic Engine haptics |

**To try it instantly — nothing to install:**

```
https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1
```

That link loads example times and opens straight into practice, so you can press
the button immediately.

Fastest path to run it locally:

```sh
cd ios-app
npm run lan        # prints a localhost URL and a phone-reachable Wi-Fi URL
```

Then open the printed address. Enter any two times in **Settings** (e.g. clear =
4s, full = 8s) and press **Begin**.

Full instructions, including the iPhone and Xcode paths:
**[`ios-app/README-IOS.md`](ios-app/README-IOS.md)**

---

## Documentation map

Start here depending on what you want:

| Document | What it covers |
|---|---|
| **[`docs/PARTICIPANT_GUIDE.md`](docs/PARTICIPANT_GUIDE.md)** | **For people trying the app.** Simple English, screen-reader friendly |
| **[`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md)** | Line-by-line trace of the feature proposal to what exists |
| **[`docs/APP_GUIDE.md`](docs/APP_GUIDE.md)** | How the app works and how to operate it — every screen, setting, and mode |
| **[`docs/TESTING.md`](docs/TESTING.md)** | How to test it: step-by-step procedures and pass/fail checklists |
| **[`docs/HAPTICS.md`](docs/HAPTICS.md)** | Vibration and haptic feedback — how it works, why iOS needs a native app, how to verify it |
| **[`docs/CHANGELOG.md`](docs/CHANGELOG.md)** | Every change made, what it fixed, and when |
| **[`ios-app/README-IOS.md`](ios-app/README-IOS.md)** | Installing and running on an iPhone (both paths) |

### Printable versions

Every guide below is also in `docs/pdf/` as a PDF, for reading away from a code
editor or handing to someone:

- `Gap-Sense-Participant-Guide.pdf` — for people trying the app
- `Gap-Sense-Feature-Status.pdf` — the proposal traced to what is built

Historical engineering records, kept as dated artifacts:

| Document | Date | Notes |
|---|---|---|
| `REPO_ANALYSIS.md` | 2026-06-10 | Full audit of the original prototype |
| `CHANGES_REPORT.md` | 2026-07-08 | Log of the fix pass that followed the audit |
| `RESEARCH.md` | 2026-03 | Research on large-text (300%) accessibility |

> These three predate the rename and still refer to the project by its old
> working titles ("Streets", "Uncontrolled Crossings"). They are left unedited on
> purpose — they are dated records of what was found and done at the time.

---

## Repository layout

```
.
├── ios-app/                  ← THE CURRENT APP. Work here.
│   ├── www/index.html          Entire app: UI + engine, one file, no build step
│   ├── www/manifest.webmanifest, www/sw.js, www/icons/
│   ├── ios/                    Native Xcode project (Capacitor)
│   ├── serve-lan.mjs           Dev server reachable from a phone over Wi-Fi
│   └── README-IOS.md           Install / run / test guide
│
├── docs/                     Documentation (see map above)
├── index.html                Legacy prototype — kept for reference only
│
├── REPO_ANALYSIS.md          Historical: audit
├── CHANGES_REPORT.md         Historical: fix pass log
├── RESEARCH.md               Historical: accessibility research
└── .agent-tooling/, .beads/, .github/    Commit tooling inherited from a
                                          sibling project (see caveat below)
```

**Which file is the app?** `ios-app/www/index.html`. That is the one to edit.
The `index.html` at the repository root is the original prototype, superseded and
kept only for provenance.

---

## Technical summary

- **No build step, no framework, no bundler.** The entire application is one
  HTML file with inline CSS and JavaScript. Open it and it runs.
- **No backend, no accounts, no network calls.** All state lives in the browser's
  `localStorage` under `om-*` keys. Nothing is collected or transmitted.
- **Audio** is synthesized live with the Web Audio API — no sound files. Cues are
  scheduled on the `AudioContext` clock, which does not drift, and pass through a
  master limiter so overlapping cues cannot clip.
- **The visual replay** is driven by a `requestAnimationFrame` loop reading that
  same `AudioContext` clock, so sound and picture stay locked together.
- **Native shell:** [Capacitor](https://capacitorjs.com/), which wraps the web app
  in a real iOS application and provides the Taptic Engine bridge.
- **Accessibility** is a primary requirement, not an afterthought: four themes,
  text scaling to 300%, screen-reader announcements that pause during timing
  playback, redundant shape/color/text encoding, and audio-only / audio+visual /
  visual-only output modes.

---

## Accessibility statement

The intended users are blind and low-vision. Every design decision is
constrained accordingly:

- Information is **never carried by color alone** — each stage is distinguished
  by hue *and* shape *and* border style *and* a text label.
- All interface colors were checked for a minimum **4.5:1** contrast ratio
  against the text placed on them (WCAG AA), in every theme.
- Text scales to **300%** with the layout reflowing to single columns; nothing is
  clipped and no control becomes unreachable.
- Screen-reader announcements are **suppressed during replay**, so VoiceOver does
  not talk over the timing tones the exercise depends on.
- The full-screen visual replay uses colors calibrated for low vision on a black
  field, and is deliberately excluded from theming.

---

## Known limitations

- **No attempt history.** Results are discarded on reset, so an adaptive
  margin-of-error feature and any data export are blocked until a persisted
  attempt log exists.
- **Not on the App Store.** That requires a paid Apple Developer account and
  store assets. The privacy questionnaire would be trivial — the app collects
  nothing — but it is separate work.
- **No automated tests.** Verification to date has been manual plus scripted
  in-browser runs.
- **Android is not set up**, though the same Capacitor project would take it.
- **Inherited tooling.** `.agent-tooling/`, `preflight.config.mjs`, and about half
  of `.beads/issues.jsonl` were copied from a sibling Next.js project and refer to
  files that do not exist here. They are inert and can be ignored.

---

## License

ISC.
