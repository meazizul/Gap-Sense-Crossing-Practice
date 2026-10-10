# Feature Status — against Cindi's App Feature Proposal

A line-by-line trace of the requirements document (2026-05-20) to what exists in
the app today, updated after Cindi's review of 2026-10-07. Use this to walk
through the proposal in a meeting and see, for each item, whether it is done,
partly done, experimental, or still open.

**Legend:** ✅ done · 🟡 partly · 🧪 experimental, off by default · ⬜ not started

---

## The skill chain

The training sequence, and where the app now sits:

| # | Step | What it teaches | Status |
|---|---|---|---|
| — | **Crossing times** | Set by the O&M instructor | ✅ Settings, or a link |
| **1** | **Practise my timing** | An intuitive, felt sense of your crossing time | ✅ |
| **2** | **Time it from a signal** | The same sense when you do not choose the start | ✅ **New, 10 Oct** |
| **3** | **Compare practice** | Judging a sample warning time against your crossing time | ✅ Rebuilt 10 Oct |
| **4** | **At the street** | The same judgement, with real vehicles | ✅ |

**Measuring is the instructor's job.** The September build had a "Measure my
crossing" step in which the student tapped while walking. Cindi (7 Oct):
instructors time at least three crossings and use the **longest**, not an
average, and choose the start, halfway and finish points precisely; a student
pressing buttons while crossing cannot do that safely. The step was removed on
10 Oct. Settings now says so, and the Home screen points new users to Settings
or to the instructor's link.

---

## User interface

| Item | Status | Notes |
|---|---|---|
| Divide up menus / settings for easier navigation | ✅ | Home screen with four numbered steps; each activity is its own screen. Rarely-used options sit in collapsed blocks so the big controls stay near the top on a phone. Settings and Accessibility stay as dialogs. |
| Vocabulary | ✅ | "Sample warning time", never "gap" (a gap is the interval between vehicles). "First half (traffic from the left)" and "Full street (traffic from the right)". |

## Sounds

| Item | Status | Notes |
|---|---|---|
| Refine within/outside margin sounds — not easily identifiable, not loud enough at a roadside | ✅ | Rebuilt in July. They differ on three independent axes: pitch register, duration (0.12 s vs 0.30 s), and texture (pure chime vs two close frequencies beating). **Still needs a listen at a real roadside.** |
| Allow users to customize sounds | 🟡 | Two presets per role, selectable with previews. Arbitrary user-supplied sounds are not supported. |
| Sample warning time sound | ✅ | One tone that **grows louder, like a vehicle approaching, then stops** (Cindi: the old steady tone with a fade was "the opposite of vehicles"). Or two taps with silence between. A **Sample loudness** slider (20–100%) with a two-second preview sets where the quiet start becomes audible. |
| Neutral reference sound | ✅ | A two-blip "reference tick" exists for moments that are not feedback (the start signal). The within-margin chime is no longer reused as a neutral marker, which made a wrong answer end with two "you were close" sounds. |
| First tone late on the first press | ✅ | The audio engine is created at load and warmed on the first touch. |

## Settings

| Item | Status | Notes |
|---|---|---|
| Instructor sets margin and crossing times remotely via emailed/texted link | ✅ | Settings → Share time settings. Link version 2 carries the first-half time, full-street time, margin, **instructor email** and a **client code**. Checksummed; old version-1 links still work. |
| Keep that link mechanism working | ✅ | |
| Wording | ✅ | "Measured and set by the O&M instructor. Time at least three crossings and use the longest." Margin: "Chosen and set by the instructor. 0.50 s has historically been taught; there is no research yet on the right value." Default stays 0.40 s. |

## Button used for practice

| Item | Status | Notes |
|---|---|---|
| Build feedback into the button itself — different colour/shape | ✅ | The action button encodes stage four ways at once: colour, corner radius, border style, and glyph. Never colour alone. |
| Haptics/vibration for DeafBlind users, or noisy situations | ✅ | Native iOS Taptic Engine via Capacitor; Web Vibration API on Android; degrades silently in iOS Safari, which has never supported it. Distinct patterns for marker, within-margin, outside-margin, and the start signal. |

## Tutorial / Help

| Item | Status | Notes |
|---|---|---|
| HELP section — instructors | ✅ | Setting up (longest of three), margin, directions, feedback modes, progress, what is experimental. |
| HELP section — clients | ✅ | Where the times come from, then the four steps in plain language. |
| Tutorial on first open, re-runnable | ✅ | Runs automatically on first launch; re-runnable from Help. Plays each sound with an explanation, now including the sample warning time and the start signal. |

## Practice Comparison Task

Cindi's 7 Oct sketch splits this into steps. Steps 1 to 3 are built; her
fourth step is still to come.

| Item | Status | Notes |
|---|---|---|
| Step 1: judge time when not controlling the start | ✅ | **Time it from a signal.** Press Ready, random wait (longer waits optional), two-blip signal with pulse and flash, press when the crossing time is up, overlapped replay as in Practice. A press before the signal is a false start; nothing is recorded. |
| Separate from / after developing timing | ✅ | Steps 2 and 3, gated until crossing times exist. |
| User chooses first half or full street | ✅ | |
| Continuous sound option | ✅ | Default; rising loudness. |
| Two sounds with silence between | ✅ | Selectable. Both ship so clients can tell us which reads better. |
| Optional random delay before the stimulus | ✅ | "Start the sample after a short random pause" (1.2–4.2 s). |
| Answer longer / shorter / about the same — quickly, without hunting through controls | ✅ 🟡 | Three full-width buttons, and an **answer pad**: swipe up = longer, swipe down = shorter, tap = about the same (arrow keys on a keyboard). Under VoiceOver or TalkBack a web page cannot receive raw swipes, so focus lands on **About the same** when the answers open: one flick either way reaches the other two. See open questions. |
| Replay to hear direction and magnitude | ✅ | **Overlapped**, as in Practice: the sample and the real crossing time start together; a marker where the sample ends, the feedback cue where the crossing time ends. The order of the last two sounds is the direction, the distance between them the magnitude. Plays after every answer, right or wrong. The old back-to-back replay is gone. |
| Nothing auto-advances | ✅ | The student presses Play for each sample. |
| Optional follow-up on *how much* longer/shorter | ✅ | Opt-in. Runs **before** the replay, as sketched: tap out the difference, then hear the comparison replay, then your estimate against the real difference. |
| Track progress / show need for more instruction | ✅ | Every attempt logged; score line on the screen, Progress, instructor report. |
| Step 4 of Cindi's structure | ⬜ | Not yet described; awaiting her follow-up. |

## Actual Comparison Task (at the street)

| Item | Status | Notes |
|---|---|---|
| First activation when a vehicle is detected | ✅ | |
| Direction: left = first half, right = full street | ✅ | Labels now read "Approaching from the left — compared with the first half of the street" / "from the right — compared with the full street". |
| Second activation when the vehicle passes | ✅ | |
| Cancel — it turned off / never came | ✅ | Discards the trial; nothing is logged. |
| Immediate longer/shorter/same judgement | ✅ | Spoken, shown, sounded, and felt, then the overlapped replay of warning time against crossing time. |
| Ambient noise sampling to set a "quiet" threshold | 🧪 | Off by default. "Check background noise while timing" opens the microphone only while on and only on this screen; it is released on leaving. "Sample the quiet" records a 3-second median baseline; measurements started more than 6 dB above it are flagged. Cindi doubts it holds up across phones and hands; treat flags as a hint. |
| Flag samples taken in non-ideal conditions | 🧪 | Flagged in the tally and the report when the check is on. |
| Prompt to send data to instructor | ✅ | Progress → Share with my instructor. |

## Margin of error modes

| Item | Status | Notes |
|---|---|---|
| Fixed mode (current) | ✅ | Default 0.40 s, editable, labelled as the instructor's choice. |
| Adaptive (behavioural shaping / ZPD) | 🧪 | Off by default; the instructor decides. Cindi (7 Oct): no research support for the window, the step, or when to stop; keep it experimental or remove it. |
| Ceiling = the set margin | ✅ | |
| Hard-coded floor (50–100 ms suggested) | ✅ | 0.10 s. |
| One margin per task, not one overall | ✅ | A lane per activity and street type: practice, signal, compare × first half, full street. |
| Window of 10–15 trials | ✅ | Blocks of 10, evaluated once per block, not after every attempt. |
| ≥80% → reduce margin | ✅ | **× 0.92 per block** (was 0.85 per attempt once ten existed, which was too fast). |
| <60% → increase margin | ✅ | **Straight back to the set margin.** Nothing holds a student down. |
| 60–80% | ✅ | Holds. |
| Learner floor | ✅ removed | Cindi: the user "gets pinned down". Replaced by the full release above. **Reset adaptive margins** in Progress starts every lane again. |
| Record progress for the instructor | ✅ | Current margin per lane in Progress and in the report. |

## Data / Documentation

| Item | Status | Notes |
|---|---|---|
| Submission of data to OMS (and user) | ✅ | **Email it to my instructor** opens the phone's mail app with the report filled in; the student presses Send. **Copy report** remains. The app itself sends nothing. |
| Store OMS email, possibly user email | ✅ 🟡 | Instructor email is stored (Settings) and carried in the link. Client email is not stored. |
| Identity without PII | ✅ | The student name field is gone. A **client code** (letters and digits, up to 8) is stored, sent in the link, and printed in the report. Cindi: links travel by unencrypted email, use a code that cannot be linked to a person. |
| Easily accessed method to send data | ✅ | Progress screen. |
| Fully opt-in, preview before sending | ✅ | The full report is shown verbatim first. |
| Include frequency, accuracy, progression, live-task data | ✅ | Live vehicles are reported as verdicts (enough / not enough warning), not as right or wrong answers. |
| Link from OMS that triggers a send prompt | ⬜ | Not built. |
| Self-voiced confirmation of what is being sent | ⬜ | The preview is screen-reader accessible; no separate self-voicing. |

## Full accessibility

| Item | Status | Notes |
|---|---|---|
| VoiceOver and TalkBack | 🟡 | Built for it throughout. Announcements are now spoken immediately (a timing bug used to drop any message followed by a replay, so a VoiceOver user never heard the correct answer in Compare). **A real device pass is still outstanding.** |
| Keep flows easy for emerging skills; no rotor required | ✅ | Every answer is a full-width button; focus is placed for you. |
| Screen readers silent during replays | ✅ | Suppressed during playback only, in every activity. |
| Reflow with zoom / large fonts | ✅ | To 300%; every screen collapses to a single column. |
| High contrast, respects user colour settings | ✅ | Four themes plus high-contrast. Dark-theme marker glyph and button hint contrast fixed 10 Oct. |
| Leaving mid-activity | ✅ | Navigating away cancels the activity: nothing stays locked, no timer keeps running, the microphone closes. |
| Battery considerations | 🟡 | No timers or animation loops run while idle; the microphone is used only with the noise check on. No explicit battery-saver toggle. |

---

## Still open

Ranked by how much they matter:

1. **Roadside audio check** — only verified in a browser and simulator.
2. **VoiceOver/TalkBack device pass** — including whether double-tap-to-activate latency distorts a timing measurement, and whether the focus-on-the-middle-answer approach is quick enough.
3. **Cindi's fourth comparison step** — not yet specified.
4. **Per-street profiles** — several streets by name rather than one set of times.
5. **Self-voicing** for consent confirmation.
6. **App Store and Play Store** — currently TestFlight and a direct APK.

## Open questions for Cindi

- **Sample sound:** continuous rising tone or two taps — which do clients find easier to judge? Is the rising loudness right, and is the loudness slider enough?
- **Adaptive margin:** keep as an experimental option with the slower, per-task version, or remove it until there is evidence?
- **Swipe answers under a screen reader:** a web page cannot receive swipes while VoiceOver or TalkBack is running. The app puts focus on "About the same" so one flick reaches either other answer. Is that quick enough, or should an installed-app gesture be built?
- **Direction wording:** "Approaching from the left — compared with the first half of the street" — does that read correctly to clients?
- **Random pause and longer waits:** are the ranges (1.2–4 s; 1.5–4 s and 3–8 s for the signal) sensible?
