# Streets ("Uncontrolled Crossings") — Repository Analysis

**Date:** 2026-06-10
**Scope:** Full read of every file in the repo. Analysis only — no code changed.

---

## 1. What's Actually Here

The working application is **one file**: `index.html` (3,367 lines). Everything else in the repo is documentation, commit tooling, or configuration for an app structure that does not exist in this folder.

| Path | What it is | Status |
|---|---|---|
| `index.html` | The entire app: ~1,030 lines CSS, ~300 lines HTML, ~2,030 lines JS | **The real app. Works.** |
| `README.md` | Repo overview | **Describes a different repo** (see §2) |
| `RESEARCH.md` | Large-text/accessibility research notes (March 2026) | Good content; "gaps" section is stale (see §2) |
| `package.json` | npm manifest | `dev` script just runs `python3 -m http.server 8000`; `test` is a no-op |
| `.beads/issues.jsonl` | Issue tracker: 57 issues (48 closed, 3 in progress, 6 open) | Half the issues reference a **Next.js rebuild that is not in this repo** |
| `.agent-tooling/`, `preflight.config.mjs`, `commitlint.config.mjs`, `biome.json`, `.vale.ini`, `.markdownlint-cli2.jsonc`, `.beads/hooks/` | Shared commit-preflight tooling (lint, commit-message rules, secret scanning) | More files than the app itself; several configs point at missing files |
| `.github/workflows/secret-scan-{fast,deep}.yml` | CI secret scanning | Fast scan references a config file that doesn't exist (see §2) |
| `agent-tooling.config.json`, `.generated/agent-tooling-manifest.json` | Tooling manifests | Reference missing paths |

**Important context:** this folder is **not a git repository** (it looks like a GitHub ZIP export, `streets-main`). All the git hooks (`.beads/hooks/pre-commit`, `commit-msg`) are therefore inert here, and the issue tracker can't sync.

### How the app works (for orientation)

- Three practice modes: Start→Halfway, Start→Finish, Start→Halfway→Finish.
- The student taps one big button to mark moments; the app then **replays** their taps (marker tones) interleaved with the reference times (clear-time / full-street time entered in Settings), playing an "acceptable" chime or "outside" pulse depending on whether each mark fell within the margin of error. Feedback is felt duration, not numbers — consistent with the product principle.
- A synchronized visual replay (full-screen black overlay; gray flash = your mark, green circle = acceptable, orange triangle = outside) runs off the **AudioContext clock** via `requestAnimationFrame`, which is the right way to keep sound and visuals aligned.
- Settings: sound calibration with previews, visual calibration (triangle orientation, flash contrast), time entry, training exemplars, debug readout, and a share-link system that encodes clear/full/margin into a checksummed URL hash so an instructor can text a student a one-tap setup link.
- Accessibility dialog: output mode (audio-only / audio+visual / visual-only), cue banner, button flash, vibration toggle, text labels, theme (light/dark/inverted/system), high contrast, focus boost, text size to 300%, screen-reader announcements.
- All state persists in `localStorage` (~20 keys, `om-*` prefix). No backend, no network code except Vercel Analytics.

---

## 2. Errors and Inconsistencies

### 2.1 The README describes a repo that doesn't exist
`README.md` says the app lives in "the Next.js-style app structure under `app/`, `components/`, `hooks/`, `lib/`, and `styles/`" and maps `public/`, `scripts/`, `docs/`. **None of those directories exist.** The only application code is `index.html`. Anyone (human or AI agent) reading the README first will be sent in entirely the wrong direction. This is the single most misleading thing in the repo.

### 2.2 Tooling configs point at missing files
- `preflight.config.mjs` and `agent-tooling.config.json` reference `scripts/check-structure.mjs`, `docs/NEXTJS_CODE_STRUCTURE.md`, `docs/README.md`, `docs/SCRIPTS_GUIDE.md`, `docs/COMMIT_MESSAGE_SPEC.md` — none exist.
- `biome.json` excludes `public/legacy-prototype.html` — doesn't exist. It also excludes **`index.html` itself**, meaning the only file containing application code is exempt from the only linter in the repo.
- `.github/workflows/secret-scan-fast.yml` runs gitleaks with `--config /repo/.gitleaks-strict.toml` — **that file doesn't exist**, so the CI job will fail on every push/PR. The local preflight gitleaks check references the same missing file.
- `.gitignore` ignores `.next-dev.log` / `.next` artifacts — more evidence this tooling was copied from (or written for) the Next.js sibling repo.

**Conclusion:** there is (or was) a second repo — a Next.js rebuild — and this repo's README, preflight config, and roughly half the issue tracker describe *that* codebase. The two histories have been conflated.

### 2.3 RESEARCH.md lists "gaps to fix" that are already fixed
Section 7 of `RESEARCH.md` lists four gaps for the 300% text requirement. All four are already implemented in `index.html`:
1. ~~Text size max is 1.5×~~ → `xl` (200%), `xxl` (250%), `max` (300%) options exist (lines ~1301–1303, ~2266–2274).
2. ~~`largeTextLayout` misses new sizes~~ → the check includes `["largest","huge","xl","xxl","max"]` (line ~1523).
3. ~~Modal header not sticky~~ → sticky header with background and divider is implemented (lines ~910–921).
4. ~~Landscape hint only for "huge"~~ → covers `huge/xl/xxl/max` (line ~3046).

The doc even contains the exact code that now exists in the file. It should be marked "implemented" or the section removed, or future contributors will re-do (or distrust) the work.

### 2.4 "PWA" is not actually true (yet)
There is **no web app manifest and no service worker**. The app is a plain web page: it can't be installed to the home screen with proper icon/name, and it does not work offline. For a tool intended to be used standing at street corners — possibly without connectivity — offline capability is not a nice-to-have. This is the largest gap between the project's self-description and reality.

### 2.5 Dead code and dead settings (things that never run)
- **The "marker" cue is never emitted.** `emitCue()` defines a `marker` message and a `[40]` vibration pattern, but no call site ever fires `emitCue("marker", ...)`. Practical consequence: **with "Vibrate on cue" enabled, the phone never vibrates when the student taps Mark** — vibration only fires on the replay's reference cues. Given haptics are a headline upcoming feature for DeafBlind users, this existing bug matters.
- `soundEnabled` (line ~1455) is initialized `true` and **never set to false anywhere** — a mute flag with no switch.
- `getStageClassForLabel`/`getIndicatorSymbolForLabel` handle a `"boundary"` label no mode produces.
- `#statusText` has a hard-coded `hidden` attribute, so every `setStatus()` write to it is invisible; the cue banner took over its job. The `.status:empty` CSS rule is for an element that can never be seen.
- `@vercel/analytics` is an npm dependency but is never imported; the page uses the manual `window.va` + `/_vercel/insights/script.js` snippet instead. The dependency is dead weight (and the script 404s when running locally — harmless, but noisy in the console).

### 2.6 Probable audio clipping (debug values left in)
`TEST_TUNING` ships with `masterVolume: 2, userVolume: 2, feedbackVolume: 2, confirmVolume: 2` — every value pinned at the top of its own documented "safe range." Output level is `masterVolume × volumeScale`, so feedback tones run at gain **4**, and the "outside" pulse (partial gain 0.9) computes to a peak around 3.6 — well past 1.0, which WebAudio hard-clips. The "out of bounds" sound is almost certainly distorting on real devices. These read like test values that were never reset (the comment block literally calls them "Timing and loudness controls" for test/debug).

### 2.7 Naming drift
The page `<title>` is "O&M Timing Practice Prototype," social meta says "Street Timing Practice," the repo is "Streets," and the product is "Uncontrolled Crossings" — which appears nowhere in the repo. Pick one user-facing name before store submission.

### 2.8 Dev setup on a fresh clone
- `npm install && npm run dev` works **if Python 3 is installed** (the dev server for this Node project is `python3 -m http.server` — odd, but functional; any static server works since there's no build step).
- Because this is a ZIP export and not a git clone, the documented commit tooling (hooks, beads sync) cannot run at all.
- `npm test` prints "No tests configured" and exits 0. **There are zero tests** — no unit tests for the timing/encoding logic, no Playwright (one closed issue's notes mention Playwright verification being blocked because the browser binary wasn't installed — it was never set up).

### 2.9 Stale internal documentation
The maintainer "quick jump" comment at the top of `index.html` lists line numbers that have drifted ~600 lines from reality (it warns about this itself, but `TEST_TUNING` at "~1020" is actually at ~1651 — the drift is now large enough to be useless rather than approximate).

### 2.10 Open issues confirmed still real
Of the 6 open / 3 in-progress issues, the ones relevant to *this* file check out: `uc-3qz` (dark-mode primary button contrast — the running-state button uses white text on the dark theme's light-teal accent `#64d3bf`, roughly 1.9:1, a hard WCAG failure) and `uc-j9n` (VoiceOver/TalkBack review of the practice flow — no evidence of a completed pass).

---

## 3. Code Quality and Maintainability

**The good:** the code itself is much better than the "single AI-generated file" framing suggests. Naming is consistent, there's a genuinely thoughtful tuning guide comment block for non-programmers, the AudioContext-clock-driven replay is the correct architecture for sync-critical feedback, sound presets are data-driven, the share-token has versioning + checksum, and the `/* A11Y ADDITIONS */` markers show deliberate, reviewable layering.

**The structural problems:**

1. **One 3,367-line file with three languages interleaved.** Reviewing a change means scrolling between a CSS rule at line 600, markup at line 1,200, and the handler at line 3,000. The quick-jump comment exists *because* the structure fights navigation.
2. **~40 top-level mutable globals** (`stage`, `started`, `markerTimes`, `replayTimeout`, `suppressSrAnnouncements`, …) mutated from many handlers. The practice state machine (idle → marking → replay → reset) is implicit in flag combinations rather than explicit, which is where timing bugs will breed.
3. **Two timing systems coexist:** audio events are scheduled on the AudioContext clock (drift-free), but UI stage changes, cue banners, and vibration use `setTimeout` (drifts under load, throttled in background tabs). They're usually close enough; on slow devices the visuals/haptics can desynchronize from the sound — the exact thing this app cares about.
4. **Persistence is scattered:** ~20 `localStorage` keys read/written inline at every call site, no schema, no versioning. Adding "attempt history" (needed for the adaptive-margin feature) into this pattern will hurt.
5. **No linting of the app** (Biome excludes `index.html`), **no tests**, no types.

**What "cleanly maintainable" would take** (without changing behavior):
- Split into `index.html` + `styles.css` + JS modules: `audio.js` (context, presets, scheduling), `replay.js` (timeline building + the rAF loop), `state.js` (practice state machine), `settings.js` (one persistence module owning every `om-*` key), `a11y.js` (cues, announcer, themes), `share.js` (token encode/decode). The replay timeline (`visualEvents`) is already a clean event-list abstraction — promote it to *the* timeline that drives audio, visuals, and haptics from one place.
- Build the "timeline" pure functions (reference times, diff/feedback classification, token encode/decode, text-size scaling) first — they're trivially unit-testable and are the safety-critical logic.
- This is also the prerequisite work for Capacitor packaging, so it's not a detour (see §5).

Whether to fold this repo into the Next.js rebuild instead is a real strategic question — the issue tracker shows months of effort getting the Next.js version to parity with this file. **Decide which codebase is canonical and say so in the README.** Right now this repo's docs claim the Next.js structure while shipping the static file.

---

## 4. Accessibility Readiness

**Current state is a strong foundation — unusually good for a prototype:**

- **Screen readers:** native `<dialog>` with `aria-modal`, focus moved to the dialog title on open and restored to the trigger on close, `inert` + `aria-hidden` on background content, a polite `aria-live` announcer with a clear-then-set pattern, announcements suppressed during replay so VoiceOver doesn't talk over the timing tones (a genuinely thoughtful detail), decorative emoji/icons hidden, progress markers summarized via a computed `aria-label`, mode radios in a labeled `radiogroup`.
- **Text scaling:** in-app control to 300% (Apple's recommended bar; 200% is the minimum), `rem`-based CSS throughout, reflow layouts (`phone-safe-layout`, `large-text-layout`, `short-screen-layout`), sticky modal headers so Close stays reachable, no `user-scalable=no` (WCAG 1.4.4 preserved), `overflow-wrap: anywhere` defenses everywhere.
- **Vision:** light/dark/inverted/system themes, high-contrast mode, focus boost, large touch targets (the action button is huge by design), `prefers-reduced-motion` respected for the flash effect.
- **Feedback modes:** audio-only / audio+visual / visual-only output modes; visual replay shapes differ by *shape and color* (circle vs triangle), not color alone.

**Gaps for production:**

1. **No page heading or landmark structure.** There's no `<h1>` anywhere on the main screen and no visible app name; screen-reader users landing on the page get a settings button as the first element. Add a (visually styled or sr-only) `<h1>` and proper landmarks.
2. **Sound/visual calibration radio groups aren't programmatically grouped.** "Acceptable (within tolerance)" / "Out of bounds" / "User flash contrast" titles are plain `<div>`s — a screen-reader user tabbing to "Chime A" doesn't hear which group it belongs to. Use `<fieldset>/<legend>` or `role="group"` + `aria-labelledby` (RESEARCH.md itself lists this as a common failure).
3. **Dark-mode running-button contrast** (open issue `uc-3qz`) — white-on-`#64d3bf` fails WCAG hard.
4. **Vibration never fires on Mark** (dead `marker` cue, §2.5) — the one moment a DeafBlind user most needs confirmation.
5. **No completed VoiceOver/TalkBack pass** (open issue `uc-j9n`). One product-level concern to test explicitly: with VoiceOver running, activating the Mark button requires a double-tap, which adds variable latency to a *timing-measurement* app. The interaction model may need a VoiceOver-specific mode (e.g., whole-screen tap target via direct-touch, or volume-button capture in the native wrapper).
6. **Timing tones vs. screen-reader audio**: replay suppresses announcements, but VoiceOver itself may duck or talk over feedback tones. Needs device testing; in a Capacitor wrapper you can configure audio session mixing behavior.
7. The cue banner is `aria-live="off"` (correct — the announcer handles speech), and "Use text labels" toggles its visibility; this is fine, just undocumented.

---

## 5. PWA vs. Native Readiness

### The headline constraint: haptics on iOS
**`navigator.vibrate()` does not exist in Safari/WKWebView on iOS — at all, in any mode, PWA or not.** Apple has never implemented the Vibration API. The current "Vibrate on cue (if supported)" checkbox silently does nothing on every iPhone. Android Chrome supports it (coarse, on/off patterns only — no intensity).

Consequences:
- **Pure PWA → haptic feedback for DeafBlind users is impossible on iOS.** This alone decides the architecture question if haptics are a committed feature.
- **Capacitor wrapper → full haptics**: the `@capacitor/haptics` plugin exposes impact/notification/vibrate; for the rich, *duration-feel* patterns this app actually wants (distinguishable "acceptable" vs "outside" textures, marker pulses during replay), iOS **Core Haptics** (`CHHapticEngine`) supports amplitude/sharpness envelopes — accessible via a small custom plugin or community plugins. Android side maps to `VibrationEffect`.

### Option A — stay a PWA
**Work needed:** add `manifest.json` (name, icons, display: standalone, theme color), a service worker (the app is one file — a trivial cache-first worker gives full offline), iOS meta tags, install instructions.
**You get:** offline use, home-screen install, zero store overhead, instant updates, the share-link flow keeps working.
**You don't get:** App Store/Play presence (a real discoverability and credibility issue for the O&M instructor community), iOS haptics (fatal per above), reliable background audio behavior, volume-button capture.
**Verdict:** worth doing the manifest + service worker *regardless* (it's a day of work and the PWA remains the web fallback), but insufficient as the end state.

### Option B — Capacitor wrapper (recommended)
**Work needed:**
1. Restructure into a Capacitor project (`npm create @capacitor/app`, point `webDir` at the app; the zero-build static file makes this unusually easy).
2. Replace the `navigator.vibrate` path with a haptics abstraction: Web Vibration API on Android-web, `@capacitor/haptics`/Core Haptics in native builds.
3. Drive haptics from the same replay timeline as audio/visuals (the `visualEvents` array is the right hook).
4. App icons, splash screens, accessibility audit inside WKWebView (VoiceOver works in webviews; focus order and rotor behavior need a re-test), audio session config (so tones play in silent-switch mode — `AVAudioSession` category, exposed by Capacitor community plugins), App Store privacy manifest (trivial: localStorage only — but decide what to do about Vercel Analytics in the native build; simplest is to strip it there).
5. Store assets, accessibility nutrition labels (Apple now surfaces these — this app can legitimately claim a long list).
**You get:** App Store + Play presence, real haptics on iOS, the web version continues to exist from the same codebase, permanent-free is compatible (free app, no IAP).
**Risks:** WKWebView audio timing latency is fine for ~0.1s-resolution feedback but should be validated on older devices; review the §3 refactor first or the single file gets harder to maintain across two more platforms.

### Option C — native rebuild (SwiftUI + Compose, or Flutter/RN)
**You get:** best-possible audio latency (AVAudioEngine), full Core Haptics, native Dynamic Type instead of the custom text-size picker, cleanest VoiceOver semantics.
**Cost:** rebuilding the entire (already-working, already-tuned) feedback engine once or twice, ongoing parity maintenance — the beads history shows a *web-to-web* rebuild already consumed dozens of issues to reach parity. A native rebuild would be that, squared.
**Verdict:** not justified now. Capacitor delivers the two things native uniquely offers that this app needs (store presence, haptics) at ~5% of the cost. Revisit only if audio/haptic latency measurements in WKWebView fail real-device testing.

---

## 6. Feature-Build Readiness

| Planned feature | What already exists | What blocks it |
|---|---|---|
| **Improved feedback sounds** | A clean, data-driven sound system: `SOUND_PRESET_LIBRARY` (named presets), `presetTone()` (transpose/gain/duration), per-role assignment in `SOUND_FALLBACK_TONES`, an sfxr import path, A/B options with previews in Settings, and an excellent tuning-guide comment. | Nothing structural. Fix the volume clipping (§2.6) first. The sfxr path requires manually adding a local `jsfxr.js` (all `SOUND_SFXR_DATA` slots are empty) — either bundle it or delete that path. **Quick win.** |
| **Haptic feedback** | Vibrate setting + per-cue-type pattern table in `emitCue()`; a replay event timeline that haptics can hang off. | (1) The dead `marker` cue means taps never vibrate — fix immediately. (2) iOS needs Capacitor (§5) — there is no web path. (3) Haptic events should be scheduled from the replay timeline, not ad-hoc `setTimeout`s, to stay in sync with audio. |
| **Help / tutorial** | The dialog pattern (focus management, scroll lock, large-text behavior) is solid and reusable; exemplars already function as a "what should it feel like" teaching tool. | Pure content + one new dialog. No blockers. **Quick win.** Consider an sr-friendly first-run flow ("times needed" prompt already half-does this). |
| **Comparison Task mode** (judge vehicle warning time vs. crossing time) | The `modes` registry, marker rendering, and labels are extensible; audio scheduling primitives (`playSoundOption(option, startTimeSec)`) can place a "vehicle" sound at an arbitrary offset; feedback classification (diff vs. margin) is reusable. | The current engine assumes *user taps → replay vs. reference*. Comparison needs an inverted flow: app plays a stimulus, user makes a judgment (enough time / not enough), app scores it. That's a new state-machine branch, new UI (two-choice response), and a stimulus library — **moderate effort**, much easier after the §3 state-machine extraction. No platform blockers. |
| **Adaptive margin-of-error algorithm** | Margin is a manual setting; per-stage `diff` values are computed during replay (and shown in debug). | **Attempt results are discarded** — `markerTimes` and diffs vanish at reset. Prerequisite: persist an attempt log (timestamped diffs per stage per mode) in a versioned storage module. Then adaptation (e.g., tighten margin after N consecutive acceptable trials) is simple logic on top. Design question for O&M experts: adapt silently or suggest-and-confirm to the instructor? |
| **Opt-in data pipeline (instructors/research)** | The share-token system proves out encode/decode + checksum discipline; that's it. The app currently makes zero network calls with user data. | Needs: the same attempt log as above → export (the share-message UI pattern could ship a "copy results" token to a teacher with zero backend — a good v1) → a real backend with consent flow, IRB-grade anonymization, and a privacy policy (also required for the App Store listing if any data leaves the device). Largest effort of the list; the no-backend "export token" variant is a **quick-ish win**. |

---

## 7. Prioritized Recommendations

### Quick wins (hours each)
1. **Rewrite README.md** to describe this repo truthfully (single-file app, how to run it, where the Next.js sibling lives and which is canonical). Highest confusion-per-minute-to-fix ratio in the repo.
2. **Fix the dead `marker` cue** — emit it in `recordMarker()` so vibration/banner fire when the student taps Mark. One line plus a pattern decision.
3. **Reset `TEST_TUNING` volumes** from the debug values (2/2/2/2) to sane defaults and verify the "outside" pulse no longer clips.
4. **Fix dark-mode running-button contrast** (open issue `uc-3qz`).
5. **Add `manifest.json` + a minimal service worker + icons** → real installable, offline-capable PWA. Also fixes the §2.4 identity gap.
6. **Mark RESEARCH.md §7 gaps as implemented** (or delete the section) so the doc stops contradicting the code.
7. **Add `<h1>`/landmarks and `fieldset`-style grouping** for the calibration radio groups.
8. **Delete dead code** (`soundEnabled`, `boundary` branches, hidden `#statusText`, unused `@vercel/analytics` dep) and refresh or remove the stale quick-jump comment.
9. **Repair or remove broken tooling refs**: add `.gitleaks-strict.toml` (CI currently fails) or simplify the workflows; prune the missing-doc links from preflight config.
10. **Unify the product name** across title/meta (decide: "Uncontrolled Crossings").

### Medium efforts (days)
11. **Persist an attempt log** (versioned storage module; prerequisite for adaptive margin *and* the data pipeline; do it before more features pile onto raw localStorage).
12. **VoiceOver/TalkBack device pass** (open issue `uc-j9n`), including the double-tap-latency question for timing accuracy, and a decision on a VoiceOver-specific marking interaction.
13. **Help/tutorial dialog** with O&M-instructor-reviewed content.
14. **Split the single file into modules** (§3) with unit tests on the pure timing/encoding logic. Do this *before* Capacitor and before Comparison Task; everything after gets cheaper.
15. **First sound-design iteration** on the preset library (and bundle or remove the jsfxr path).

### Larger efforts (weeks)
16. **Capacitor wrapper** for App Store + Play presence and real iOS haptics (Core Haptics for patterned, intensity-varying feedback) — the only viable route to the DeafBlind haptics feature on iPhone. Keep the PWA as the free web fallback.
17. **Comparison Task mode** — new stimulus-then-judgment flow on the refactored state machine.
18. **Adaptive margin algorithm** on top of the attempt log, designed with O&M instructors.
19. **Data pipeline**: stage 1 = backend-free "results token" the student texts to their instructor (reuses the share-message UX); stage 2 = consented research backend with privacy policy and anonymization.
20. **Resolve the two-codebase question** with the Next.js rebuild: pick a canonical app, archive or clearly subordinate the other, and align the tooling configs with whichever wins.

---

*Report generated from a full read of `index.html`, `README.md`, `RESEARCH.md`, `package.json`, all tooling configs, both CI workflows, and all 57 tracked issues. Line numbers cited are approximate (the file has no stable anchors).*
