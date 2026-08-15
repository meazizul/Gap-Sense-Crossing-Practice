# Changes Report — Fix Pass (2026-07-08)

Scope: the five fix categories requested after `REPO_ANALYSIS.md`. All changes are in
`index.html` unless noted. The core timing engine, the AudioContext-clock replay
synchronization, and the feedback-as-duration behavior were not altered.

**Verification after each category:** `node --check` on the extracted script, then a real
browser session against `python3 -m http.server 8000` — page load, console error check,
scripted full practice runs (Begin → Mark → Mark → replay → reset), sound previews,
exemplar playback from the Settings dialog, dialog open/close, and theme switching. No
console errors at any point.

---

## 1. Audio clarity (`index.html`)

**Issue:** `TEST_TUNING` shipped with all four volume multipliers at the debug maximum
(`2/2/2/2`). Output level is `masterVolume × roleVolume`, so feedback tones ran at gain
**4×**. The "outside" pulse's partials summed to 1.08, so its peak computed to ~4.3× full
scale — hard-clipped into distortion. Clipped audio sounds quieter and mushier, which
matches the instructor's complaint. Separately, the outside pulses' 240–260 Hz
fundamentals sit below what small phone speakers reproduce, so much of that cue never
left the speaker at all.

**What changed:**

**(a) `TEST_TUNING` volumes** — before → after:

| Key | Before | After |
|---|---|---|
| `masterVolume` | 2 | **1** |
| `userVolume` | 2 | **1** |
| `feedbackVolume` | 2 | **1** |
| `confirmVolume` | 2 | **0.8** |

`confirmVolume` sits below the others deliberately: the button-press chime is the least
informative sound, and keeping it under the feedback cues stops it masking them.

**(b) `SOUND_PRESET_LIBRARY` presets** — before → after:

| Preset (role) | Before | After |
|---|---|---|
| `chime_soft` (acceptable A) | 0.12 s; 659 Hz @ 0.18 + 823 Hz @ 0.08 (peak sum 0.26) | 0.12 s; 659 Hz @ **0.55** + 823 Hz @ **0.25** (peak sum 0.80) |
| `chime_bright` (acceptable B) | 0.12 s; 523 @ 0.22 + 659 @ 0.11 (0.33) | 0.12 s; 523 @ **0.55** + 659 @ **0.25** (0.80) |
| `pulse_low` (outside A) | 0.12 s; 240 @ 0.9 + 300 @ 0.18 (1.08) | **0.30 s; 330 @ 0.42 + 349 @ 0.38** (0.80) |
| `pulse_dull` (outside B) | 0.12 s; 260 @ 0.85 + 312 @ 0.2 (1.05) | **0.30 s; 294 @ 0.42 + 311 @ 0.38** (0.80) |
| `marker_tone` | 0.14 s; 410 @ 0.22 | 0.14 s; 410 @ **0.75** |
| `confirm_chime` | 0.18 s; 350 @ 0.24 + 700 @ 0.11 | 0.18 s; 350 @ **0.5** + 700 @ **0.22** |

**(c) Master limiter** — a `DynamicsCompressorNode` (threshold −2 dB, knee 0, ratio 20,
attack 1 ms, release 50 ms) now sits between every tone's gain node and
`context.destination`, created once alongside the AudioContext.

**Reasoning:**

- *Loudness without clipping:* every preset's partial gains now sum to ≤ 0.80 of full
  scale with the multipliers at 1 — about −2 dB below digital maximum, i.e. effectively
  as loud as a clean signal can be. The old configuration was "louder" on paper (gain 4)
  but everything past 1.0 is thrown away by the DAC as distortion.
- *Why a limiter at all:* during replay, a user marker tone and a reference feedback cue
  land at the same moment precisely when the student is accurate — the two can sum past
  1.0 (0.75 + 0.80). The limiter is tuned so isolated cues pass through untouched
  (their −2 dB peaks sit at the threshold) and only genuine overlaps get caught,
  gracefully instead of clipping. It also makes the tuning knobs safe for the
  non-programmer maintainers the inline guide is written for: cranking a value above 1
  now squashes rather than distorts.
- *Distinctness (three independent dimensions):* "acceptable" is a short (0.12 s) pure
  high chime (523–823 Hz); "outside" is now 2.5× longer (0.30 s), pitched low-mid
  (~300–350 Hz), and built from two closely spaced frequencies (19 Hz / 17 Hz apart)
  that beat against each other, giving a rough, buzzing, "wrong"-feeling texture no
  pure chime can be confused with. Pitch register, duration, and texture all differ —
  and the distinction remains a felt quality, not a number.
- *Phone-speaker audibility:* the outside pulses moved from 240–260 Hz fundamentals to
  294–349 Hz. Small phone speakers roll off steeply below ~300 Hz; the old pulses lost
  most of their energy in the speaker itself. The new register is reproducible on a
  phone at roadside volume while still sitting clearly *below* the chimes perceptually.
- The tuning-guide comment block was updated to match (typical ranges now top out at
  1.0, with a note about the limiter).

**Follow-up recommended:** these values were verified clean in-browser but should get a
listen on real target phones (iPhone + Android) at roadside volume; the presets are
data-only and trivially adjustable.

## 2. Marker-cue bug (`index.html`)

**Issue:** `emitCue()` defined a `marker` cue (message "Marker recorded…", vibration
pattern `[40]`) but no call site ever emitted it. Tapping Mark during practice produced
no cue — vibration/banner/announcement only fired during replay. This is the feedback
path haptics will later use.

**What changed:** in `recordMarker()`, immediately after a mark is recorded
(`markerTimes.push(elapsed); playConfirmTone(); stage += 1;`), added:

```js
emitCue("marker", { stageLabel: modes[currentMode].labels[stage - 1] });
```

Verified in-browser with a spy on `emitCue`: a full three-tap run now produces
`start → marker:Halfway → marker:Finish → replay_start → reference cues → replay_end`.

**Note (left as designed):** the first tap ("Begin") still emits the `start` cue, which
has no vibration pattern. If DeafBlind users should also feel the Begin tap, add a
pattern for `start` in `emitCue()`'s `patterns` table — one line, but it's a design
decision so it was not made unilaterally.

## 3. Documentation honesty (`README.md`, `RESEARCH.md`)

**Issue (README):** described a Next.js-style structure (`app/`, `components/`,
`hooks/`, `lib/`, `styles/`, `public/`, `scripts/`, `docs/`) — none of which exist here.
The entire app is `index.html`.

**What changed:** rewrote `README.md` to state that the whole app is the single static
`index.html` (no build step), give a section-by-section map of the file, document how to
run it (`npm run dev` → `python3 -m http.server 8000`, or any static server), explain the
harmless local 404 from the Vercel Analytics script, point to the analysis/report/research
docs, and clarify that the Next.js references in `.beads/issues.jsonl` belong to a sibling
repository. The shared-commit-tooling section was kept but corrected (notes that some
preflight-referenced paths come from the shared template and don't exist here, and that
`index.html` is currently excluded from Biome linting).

**Issue (RESEARCH.md):** §7 listed four "gaps to fix" for 300% text scaling that are all
already implemented in `index.html`, and §8's recommended code is likewise already in
the file.

**What changed:** §7's list is now titled "Done / historical — gaps identified for the
300% requirement (all fixed)" with each item struck through, marked **fixed**, and
annotated with where the implementation lives. §8 got a "(historical — implemented)"
title and status note. No research content was deleted.

## 4. Accessibility quick wins (`index.html`)

**(a) Page heading.** Added `<h1 class="app-title">Uncontrolled Crossings</h1>` as the
first element in `<main>`, with compact CSS (1.2 rem, centered) so it doesn't disturb the
phone layout. The page previously had no heading at all — screen-reader users landed on
the Settings button.

**(b) Radio-group semantics.** Converted five unlabelled radio clusters from
`<div class="option-group">` + `<div class="option-group-title">` to
`<fieldset class="option-group">` + `<legend class="option-group-title">`:

1. "Acceptable (within tolerance)" — sound choice
2. "Out of bounds (outside tolerance)" — sound choice
3. "Outside triangle orientation" — new fieldset; the two labels were previously bare
   siblings reading "Outside triangle orientation: Up/Down", now a legend with "Up" /
   "Down" options (screen readers announce the group name once instead of it being
   baked into each label)
4. "User flash contrast" (Soft/Balanced/High)
5. "Preferred feedback" (audio-only / audio+visual / visual-only), in the Accessibility
   dialog

Visually safe by construction: the existing CSS already targeted `fieldset, .option-group`
and `legend, .option-group-title` with identical rules. All class names were kept, so the
`phone-safe-layout` grid rules still apply. Verified all radio groups still function.

**(c) Dark-mode contrast failure (open issue `uc-3qz`).** `.action-btn.running` and the
checked `.mode-toggle` pill used `background: var(--accent); color: #fff`. In the dark
theme the accent is light teal `#64d3bf`, making white text ~1.8:1 — a hard WCAG failure
(the inverted theme's white-on-cyan failed the same way). Added a per-theme `--on-accent`
variable (light: `#ffffff`; dark: `#0f1315` ≈ 10:1 on the teal; inverted: `#000000` on
cyan; high-contrast: `#ffffff` on black) and replaced both hard-coded `#fff` declarations
with `var(--on-accent)`. The fixed-background stage states (`stage-start/halfway/finish`)
keep white text — their backgrounds are dark in every theme. Verified computed colors in
the browser: dark-theme running button now renders `rgb(15,19,21)` on `rgb(100,211,191)`.

**(d) Extra fix, discovered during verification (pre-existing, not caused by this pass):**
choosing the **Light** theme while the OS is in dark mode rendered several buttons with
**white text on white surfaces** (invisible). Cause: `:root { color-scheme: light dark }`
lets the UA pick dark-mode default button text (white) even when the app forces light
theme variables, and `.settings-trigger`, `.a11y-trigger`, and `.action-btn` never set an
explicit `color`. This matches closed issue `uc-ewy` ("Repair forced light mode text
loss"), whose described fix is not present in this copy of the file. Applied the minimal
version of that fix: `color-scheme: light` on `body[data-theme="light"]`,
`color-scheme: dark` on the dark and inverted theme blocks, and explicit
`color: var(--text)` on the three buttons. Verified all four theme selections via the real
theme picker: every one now computes readable text/background pairs.

All existing accessibility behavior (announcer, cue suppression during replay, text
scaling, output modes, focus management) was left untouched and re-verified working.

## 5. Dead-code cleanup (`index.html`, `package.json`)

Everything below was confirmed unreachable before removal (grep + behavior test):

- **Mute flag:** `let soundEnabled = true;` was never set to `false` anywhere — a mute
  switch with no UI. Removed the flag, its two guard lines, and the now-pointless
  `allowMuted` parameter that existed only to bypass it (threaded through
  `playCompositeTone`, `playSoundOption`, `playConfirmTone`, `playUserMarkerTone`, and
  ~7 call sites). No behavior change: the guard could never fire.
- **Hidden status element:** `<div id="statusText" hidden>` was permanently hidden (the
  cue banner took over its job), so every `setStatus()` write to it was invisible.
  Removed the element, its `const`, and the write. The `.status` CSS class was **kept** —
  the debug readout (`#debugText`) still uses it.
- **SFXR/jsfxr path:** the custom-sound engine depended on a local `jsfxr.js` that was
  never added, and every `SOUND_SFXR_DATA` slot was empty — the path was dead on both
  ends. Removed: `SOUND_SFXR_DATA`, `sfxrBufferCache`, `parseSfxrData`,
  `normalizeSfxrData`, `buildSfxrSource`, `getSfxrAudioBuffer`, `playSfxrSound`,
  `warnIfSfxrConfiguredWithoutEngine` (+ its startup call), the `sfxrData:` fields in
  `feedbackOptions`/`userSoundOptions`, the sfxr branch in `playSoundOption`, the
  "add a local jsfxr script" HTML comment, and tuning-guide §5. If custom designed
  sounds are wanted later, the preset library is the intended surface.
- **Stale maintainer quick-jump comment:** the line-number column had drifted ~600 lines;
  removed the numbers (kept the search tokens, which are the reliable part) and the two
  sfxr entries.
- **`package.json`:** removed the unused `@vercel/analytics` dependency. The page uses
  the manual `window.va` stub + `/_vercel/insights/script.js` snippet, which does not
  need the npm package; that inline snippet was kept.

**Considered but deliberately NOT removed** (listed per instructions rather than deleted):

- The `"boundary"` label branches in `getStageClassForLabel()` /
  `getIndicatorSymbolForLabel()` — unreachable today (no mode uses that label) but they
  read as planned vocabulary for a future mode; harmless.
- The `tones` object — still used by `SOUND_PRESET_LIBRARY` (marker and confirm presets).
- The `.status:empty { display: none }` CSS rule — still active for `#debugText`.

## Skipped

Nothing from the requested list was skipped — every described issue matched the code as
analyzed. The only additions beyond the literal list are flagged above: the forced-light
invisible-text fix (§4d) and the two notes in §2 and §5 about decisions left to the team.

## Out of scope (untouched, per instructions)

No Capacitor wrapper, no native migration steps, no PWA manifest/service worker.
