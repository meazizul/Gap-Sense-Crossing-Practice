# Feature Status — against Cindi's App Feature Proposal

A line-by-line trace of the requirements document (2026-05-20) to what exists in
the app today. Use this to walk through the proposal in a meeting and see, for
each item, whether it is done, partly done, or still open.

**Legend:** ✅ done · 🟡 partly · ⬜ not started

---

## The skill chain

The training sequence, and where the app now sits:

| # | Step | What it teaches | Status |
|---|---|---|---|
| **1** | **Measure my crossing** | How long your crossing actually takes | ✅ **New** |
| **2** | **Practise my timing** | An intuitive, felt sense of that duration | ✅ Existing |
| **3** | **Compare practice** | Judging a gap against your crossing time | ✅ **New** |
| **4** | **At the street** | The same judgement, with real vehicles | ✅ **New** |

Step 1 was the gap: the app previously *began* from two numbers an instructor
measured with a stopwatch and typed into Settings. It now measures them itself.

---

## User interface

| Item | Status | Notes |
|---|---|---|
| Divide up menus / settings for easier navigation | ✅ | Home screen with four numbered steps; each activity is its own screen. Settings and Accessibility stay as dialogs. |

## Sounds

| Item | Status | Notes |
|---|---|---|
| Refine within/outside margin sounds — not easily identifiable, not loud enough at a roadside | ✅ | Rebuilt. They differ on three independent axes: pitch register, duration (0.12 s vs 0.30 s), and texture (pure chime vs two close frequencies beating). Outside cue moved from 240–260 Hz to 294–349 Hz because phone speakers roll off below ~300 Hz. Debug volumes that were clipping at 4× gain were reset and a master limiter added. **Still needs a listen at a real roadside.** |
| Allow users to customize sounds | 🟡 | Two presets per role, selectable with previews. Arbitrary user-supplied sounds are not supported. |

## Settings

| Item | Status | Notes |
|---|---|---|
| Instructor sets margin and crossing times remotely via emailed/texted link | ✅ | Settings → Share time settings. Generates a checksummed link plus a separate plain link, so rich previews stay readable. |
| Keep that link mechanism working | ✅ | Carried over unchanged. |

## Button used for practice

| Item | Status | Notes |
|---|---|---|
| Build feedback into the button itself — different colour/shape | ✅ | The action button encodes stage four ways at once: colour, corner radius, border style, and glyph. Never colour alone. |
| Haptics/vibration for DeafBlind users, or noisy situations | ✅ | Native iOS Taptic Engine via Capacitor; Web Vibration API on Android; degrades silently in iOS Safari, which has never supported it. Distinct patterns for marker, within-margin, and outside-margin. |

## Tutorial / Help

| Item | Status | Notes |
|---|---|---|
| HELP section — instructors | ✅ | Help screen, "For instructors": setup, margin guidance, feedback modes, progress, roadside noise sampling. |
| HELP section — clients | ✅ | Help screen, "For clients": the four steps in plain language. |
| Tutorial on first open, re-runnable | ✅ | Runs automatically on first launch; re-runnable from Help. Plays each sound with an explanation of what it means. |

## Practice Comparison Task

| Item | Status | Notes |
|---|---|---|
| Separate from / after developing timing | ✅ | Step 3, gated until crossing times exist. |
| User chooses half street or full street | ✅ | |
| Continuous sound option | ✅ | Default. |
| Two sounds with silence between | ✅ | Selectable — you were unsure which reads better, so both ship. |
| Answer longer / shorter / about the same | ✅ | Three full-width buttons, minimum 4.2 rem tall, no swiping into form controls. |
| If inaccurate: replay to hear direction and magnitude | ✅ | Plays the gap, then the crossing time, back to back. |
| If accurate: optional follow-up on *how much* longer/shorter | ✅ | Opt-in checkbox. Student taps out the difference and hears their estimate against the true difference. |
| Track progress / show need for more instruction | ✅ | Every attempt logged; Progress screen and instructor report. |

## Actual Comparison Task (at the street)

| Item | Status | Notes |
|---|---|---|
| First activation when a vehicle is detected | ✅ | |
| Direction: left = half street, right = full street | ✅ | Set before starting, so only one big control is needed while timing. |
| Second activation when the vehicle passes | ✅ | |
| Cancel — it turned off / never came | ✅ | Discards the trial; nothing is logged. |
| Immediate longer/shorter/same judgement | ✅ | Spoken, shown, sounded, and felt, then both durations replayed. |
| Ambient noise sampling to set a "quiet" threshold | ✅ | "Sample the quiet" records a 3-second median baseline. Measurements started more than 6 dB above it are flagged in the log and the report. Audio is analysed on-device and never recorded. |
| Flag samples taken in non-ideal conditions | ✅ | Flagged in the tally and in the instructor report. |
| Prompt to send data to instructor | ✅ | Progress → Share with my instructor. |

## Margin of error modes

| Item | Status | Notes |
|---|---|---|
| Fixed mode (current) | ✅ | Default 0.40 s, editable. |
| Adaptive (behavioural shaping / ZPD) | ✅ | See the algorithm below. |
| Ceiling = the set margin | ✅ | |
| Hard-coded floor (50–100 ms suggested) | ✅ | 0.10 s. Below that we would be measuring touchscreen latency, not time perception. |
| Rolling window of 10–15 trials of the same type | ✅ | 10, per activity and street type. |
| ≥80% → reduce margin — *"looking to you for help on the mathematics"* | ✅ | **× 0.85 per step.** Geometric, so each tightening is proportionally the same challenge. From 0.40 s it takes about 9 successful windows to reach the floor — a training arc, not one sitting. |
| <60% → increase margin | ✅ | Steps back to the last margin where they held ≥80%, capped at the ceiling. |
| 60–80% | ✅ | Holds. Productive struggle. |
| Two successive failures → pin learner floor | ✅ | Floor pinned at the last ≥80% margin; instructor can clear it in Progress. |
| Record progress for the instructor | ✅ | Current margin per lane shown in Progress and in the report. |

## Data / Documentation

| Item | Status | Notes |
|---|---|---|
| Submission of data to OMS (and user) | 🟡 | The report is generated and copied to the clipboard for the student to paste into any email or message. Direct send would need a backend or a mail integration — deliberately avoided for now. |
| Store OMS email, possibly user email | 🟡 | Student name is stored; instructor email is not yet. |
| Easily accessed method to send data | ✅ | One button on the Progress screen. |
| Fully opt-in, preview before sending | ✅ | The full report is shown verbatim first. Nothing leaves the device otherwise. |
| Include frequency, accuracy, progression, live-task data | ✅ | All present, including noise flags. |
| Link from OMS that triggers a send prompt | ⬜ | Not built. |
| Self-voiced confirmation of what is being sent | ⬜ | The preview is screen-reader accessible, but there is no separate self-voicing. |

## Full accessibility

| Item | Status | Notes |
|---|---|---|
| VoiceOver and TalkBack | 🟡 | Built for it throughout — landmarks, live regions, focus moved on screen change, labelled groups, large targets, no rotor needed. **A real device pass is still outstanding** (`uc-j9n`). |
| Keep flows easy for emerging skills; no rotor required | ✅ | Every answer is a full-width button; no text fields in any practice flow. |
| Screen readers silent during replays | ✅ | Announcements suppressed during every playback, in all four activities. |
| Reflow with zoom / large fonts | ✅ | To 300%; every new screen collapses to a single column. |
| High contrast, respects user colour settings | ✅ | Four themes plus high-contrast; gradients flattened where needed. |
| Battery considerations | 🟡 | No timers or animation loops run while idle, and the microphone is opened only on the "At the street" screen and released on leaving it. There is no explicit battery-saver toggle. |

---

## Still open

Ranked by how much they matter:

1. **Roadside audio check** — the sounds were rebuilt to fix a real clipping and speaker-response problem, but only verified in a browser and simulator. This needs someone standing next to traffic.
2. **VoiceOver/TalkBack device pass** — including the open question of whether double-tap-to-activate latency distorts a timing measurement.
3. **Instructor email stored + send link** — the last piece of the data-sharing flow.
4. **Per-street profiles** — save several streets by name rather than one set of times.
5. **Self-voicing** for consent confirmation.
6. **Android build** — the code path exists; the native project does not.

## Open questions for Cindi

- **Adaptive step size:** is × 0.85 per window the right aggressiveness? It is a single constant, trivially changed.
- **Learner floor:** should it ever expire on its own, or only be cleared by an instructor?
- **Gap sound:** continuous or two taps — which do clients find more intuitive? Both ship so this can be answered empirically.
- **Live task direction:** is left/right the right mapping to half/full street everywhere, or does it depend on the country and side of the road?
- **Measurement:** is averaging three walks right, or should outliers be discarded?
