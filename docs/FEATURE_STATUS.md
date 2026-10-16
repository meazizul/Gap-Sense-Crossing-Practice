# Feature Status — against Cindi's App Feature Proposal

A line-by-line trace of the requirements document (2026-05-20) to what exists in
the app today (build 7, 16 October 2026), including Cindi Lashinsky's first
review (7 October) and her second round of feedback (build 7). Use this to walk
through the proposal in a meeting and see, for each item, whether it is done,
partly done, experimental, or still open.

**Legend:** ✅ done · 🟡 partly · 🧪 experimental, off by default · ⬜ not started · 💬 waiting on a decision

---

## The skill chain

| # | Step | What it teaches | Status |
|---|---|---|---|
| — | **Crossing times** | Set by the O&M Specialist | ✅ Instructor setup, or a link |
| **1** | **Practice my timing** | An accurate sense of your crossing times | ✅ |
| **2** | **Comparison preparation** | The same sense when you do not choose the start | ✅ Renamed and reworked in build 7 |
| **3** | **Comparison practice** | Judging a sample warning time against your crossing time | ✅ Reworked in build 7 |
| **4** | **At the street** | The same judgment, with real vehicles | ✅ Reworked in build 7 |

**Measuring is the instructor's job.** Instructors time at least three
crossings and use the **longest**. The student never measures; the "Measure my
crossing" step was removed in October.

---

## Second round of feedback (build 7)

| Item | Status | What was done |
|---|---|---|
| App name: "gap" means time between vehicles in published work | 💬 | Kept as "Gap Sense" for now; the team decides. The name sits in one place in the code, so a rename is small. |
| 1. American English by default | ✅ | All app text is American English (practice, curb, traveler, judgment). A British regional option was not added. |
| 2A. Separate instructor setup page, on / off / optional | ✅ | **Instructor setup** screen: which activities show, which practice modes, and for each option on, off, or student chooses. Fixed options are hidden from the student with a short note. Optional instructor code. |
| 2B. Sending to the instructor without copy and paste | ✅ | **Send my progress to my instructor** → confirm → phone's share menu (Messages, Mail, any app). Works without Mail set up. No server. |
| 2B-i. Send from inside the app with a confirmation | 🟡 | Confirmation, then the share menu. Sending directly with no other app would need a server and a privacy review; not built. |
| 2C. Share-sheet button / direct to Messages | ✅ | **Share the setup link** (share sheet) and **Text it to the student** (Messages, add the number). |
| 2C-i. Choose what the link includes; fully configured student | ✅ | Tick times and margin, instructor email and student code, and the activities and options. One link sets the student's phone up. |
| 2C-i. Link opened before the app is installed | ✅ | First-run notice tells the student to tap the link again. A browser that applies a setup offers **Open in the Gap Sense app**. |
| 3A. No sound on iOS (signal page) | ✅ 🟡 | Likely cause found and fixed: the sound engine did not recover after iOS interrupted it, and the old haptics engine shared the audio session. Sound engine verified running in the iOS 27 simulator. **Needs confirming on a real iPhone.** |
| 3B. Same continuous sound option, user stops it | ✅ | Steady sound plays until the student presses. Or one short beep. Instructor or student chooses. |
| 3C. Confusing beginning beep | ✅ | Replaced by the spoken words **"Get ready"** and two light taps. |
| 3D. Title uses "signal" | ✅ | Renamed **Comparison preparation**. |
| 3E. More varied waits | ✅ | Quick (0.7–2 s), medium (2–5 s), long (5–10 s), never the same band three times in a row. |
| 4A. No sound on iOS (comparison) | ✅ 🟡 | Same fix as 3A. |
| 4B. Single steady volume, high volume possible | ✅ | No fade at either end; loudness defaults to 100%. |
| 4B-i. Lower pitch option | ✅ | **Sound pitch** slider, five steps from lowest (165 Hz) to high (523 Hz). |
| 4C. Replay played the right/wrong cue at the crossing time | ✅ | The replay now marks the crossing time with the student's own "this is your time" sound and flash. |
| 4C-i. Visual result before the replay | ✅ | The circle or triangle shows with the right/wrong sound, plus the haptic. |
| 4D. Swipes only inside the box; page scrolled | ✅ | Answers open a **full-screen pad** that never scrolls. Buttons on the pad for screen readers. |
| 4E-i. "How much" only after a correct longer/shorter | ✅ | |
| 4E-ii. Clearer magnitude replay, option (a) or (b) | ✅ | Both built. (a) combined is the default; (b) practice-style is an instructor choice. |
| 4 (street) A. Remove the quiet measurement | ✅ | Removed, with all microphone use and the microphone permission. |
| 4 (street) B-i. Where to stand | ✅ | "Position yourself as directed by your O&M Specialist, so you can look or listen for approaching vehicles." |
| 4 (street) B-i-a/b. Hearing or vision, recorded | ✅ | Toggle on screen (or fixed by the instructor); saved with each vehicle and shown in the report. |
| 4 (street) B-ii. "Tap when you think you detect" | ✅ | In the instructions. |
| 4 (street) C-i-a-1. Swipe left/right to detect, other gestures to finish | ✅ | Swipe left or right toward the side; tap when it passes; swipe down if it never came. |
| 4 (street) C-i-a-2. Direct Touch for VoiceOver users | 🟡 | Not possible inside a web view: Direct Touch can only be set on native views. Screen reader users get buttons on the same pad that do the same steps. A native gesture surface could be built later. |
| 4 (street) C-i-b. Student judges; app does not give the answer | ✅ | Same answer pad as Comparison practice. |
| 4 (street) C-i-b-1/2. "How much" if correct; skip to replay if wrong | ✅ | |
| 4 (street) C-i-b-3. Toggle on / off / optional | ✅ | Judging and "how much" each on, off, or student chooses. |
| 4 (street) C-iii. Replay always / never / errors only | ✅ | Plus "student chooses". "Never" plays only the right or wrong sound. |
| 5A. Siri Shortcuts | ✅ | iPhone: "Practice my timing in Gap Sense" and three more work with no setup and appear in the Shortcuts app. A **Siri and shortcuts** screen explains them. Android: launcher shortcuts. |
| 5B. Self-voicing option | ✅ | **Speak directions aloud**, with a speaking rate, in Accessibility. |
| 5C. VoiceOver reads every item; hidden "home" heading | ✅ | Each activity is one button named by title and description. The hidden heading is gone; focus goes to the visible screen title. **Real-device check pending.** |
| 5D. VoiceOver / TalkBack / JAWS testing by skilled users | ⬜ | Needs people; see Still open. |
| 6A. O&M guidance on first run and prominent | ✅ | First-run notice (cannot be skipped with Escape, shown even from the conference link), a permanent line on Home, and in Help. |
| 6B. Task descriptions | ✅ | Cindi's wording used on Home and as each screen's introduction. |
| 6C. "Longer" does not mean long enough | ✅ | Note on Comparison practice and At the street until dismissed; Help can show it again. |
| Haptics: "still trying to figure out the haptics" | ✅ 🟡 | New native haptics plugin with one persistent, haptics-only Core Haptics engine. Vibration switched back on once for upgraders. **Needs feeling on a real iPhone.** |
| 6D–6F. Feedback collection, PennDel AER, headphones in the program | — | Project decisions, not app features. |

---

## User interface

| Item | Status | Notes |
|---|---|---|
| Divide up menus / settings for easier navigation | ✅ | Home with the activities; each activity is its own screen; Instructor setup is its own screen. Settings (sounds, visuals, examples) and Accessibility stay as dialogs. |
| Vocabulary | ✅ | "Sample warning time", never "gap". "First half (traffic from the left)" and "Full street (traffic from the right)". |

## Sounds

| Item | Status | Notes |
|---|---|---|
| Refine within/outside margin sounds | ✅ | They differ on three axes: pitch register, duration (0.12 s vs 0.30 s), and texture. **Still needs a listen at a real roadside.** |
| Allow users to customize sounds | 🟡 | Two presets per role, plus sample loudness and pitch. Arbitrary user-supplied sounds are not supported. |
| Sample warning time sound | ✅ | One steady sound at one loudness, or two beeps. Loudness (20–100%, default 100%) and pitch controls with a preview. |
| "This is your time" sound | ✅ | The student's own marker sound; in comparison replays it marks where the crossing time ends. |
| First tone late on the first press | ✅ | The audio engine is created at load and warmed on the first touch. |
| Sound check | ✅ | Accessibility → **Play a test sound** reports whether the sound engine is running. |

## Settings and links

| Item | Status | Notes |
|---|---|---|
| Instructor sets margin and crossing times remotely | ✅ | Instructor setup → **Share the setup link** or **Text it to the student**. Link version 3 carries any chosen parts; versions 1 and 2 still import. Checksummed. |
| Links made in the installed app | ✅ | Always point at the public web address. |
| Wording | ✅ | "Measured and set by the O&M Specialist. Time at least three crossings and use the longest." Margin: "Chosen and set by the instructor." Default 0.40 s. |

## Button used for practice

| Item | Status | Notes |
|---|---|---|
| Feedback built into the button — color/shape | ✅ | Color, corner radius, border style, and glyph. Never color alone. |
| Haptics for DeafBlind users, or noisy places | ✅ | iOS: Gap Sense's own Core Haptics plugin. Android: Capacitor Haptics. On by default. Distinct patterns for your tap, within margin, outside margin, a sample's ends, and "get ready". |

## Tutorial / Help

| Item | Status | Notes |
|---|---|---|
| HELP — instructors | ✅ | Setting up, margin, directions, feedback modes, progress, what is experimental. |
| HELP — students | ✅ | Where the times come from, then the four steps in plain language. |
| Tutorial on first open, re-runnable | ✅ | Follows the O&M notice on first launch; re-runnable from Help. Includes the sample warning time and "Get ready". |

## Comparison practice

| Item | Status | Notes |
|---|---|---|
| Step 1: judge time when not controlling the start | ✅ | Comparison preparation. |
| Separate from / after developing timing | ✅ | Locked until crossing times exist. |
| User chooses first half or full street | ✅ | |
| Continuous sound option | ✅ | Default. Steady, no fade. |
| Two sounds with silence between | ✅ | Selectable, or fixed by the instructor. |
| Optional random delay | ✅ | 1.2–4.2 s; on, off, or student chooses. |
| Answer quickly | ✅ | Full-screen pad (swipe up, down, tap) plus three buttons; focus on "About the same". |
| Replay to hear direction and magnitude | ✅ | Sample plus the student's own sound at the crossing time. |
| Nothing auto-advances | ✅ | |
| Optional "how much" | ✅ | Only after a correct longer/shorter. Replay (a) or (b). |
| Track progress | ✅ | Score line, Progress, report. |
| Cindi's fourth comparison step (from her first review) | ⬜ | Still awaiting her description. |

## At the street

| Item | Status | Notes |
|---|---|---|
| Detection with direction | ✅ | Swipe left or right; buttons for screen readers. Left = first half, right = full street. |
| Arrival | ✅ | Tap (or swipe up). |
| Never came | ✅ | Swipe down; noted, not scored. |
| Student's judgment, no answer given first | ✅ | |
| Hearing or vision recorded | ✅ | |
| Replay choice | ✅ | Always, errors only, never. |
| Background noise check | removed | Removed in build 7 at Cindi and Dona's request. |
| Send data to instructor | ✅ | Progress → Send my progress to my instructor. |

## Margin of error modes

| Item | Status | Notes |
|---|---|---|
| Fixed mode | ✅ | Default 0.40 s, editable, the instructor's choice. |
| Adaptive (behavioral shaping / ZPD) | 🧪 | Off by default, in Instructor setup. No research support yet for the window, step, or stopping rule. |
| Ceiling = the set margin; floor 0.10 s | ✅ | |
| One margin per task and street | ✅ | |
| Blocks of 10; ≥80% tighten ×0.92; <60% back to the set margin; 60–80% hold | ✅ | |
| Record progress for the instructor | ✅ | Current margin per lane in Progress and the report. |

## Data / Documentation

| Item | Status | Notes |
|---|---|---|
| Submission of data to the instructor | ✅ | Confirm, then share menu. **Email it instead** and **Copy report** remain. The app sends nothing by itself. |
| Store instructor email | ✅ | Instructor setup; carried in the link. |
| Identity without personal data | ✅ | A **student code** (letters and digits, up to 8). Never a name. |
| Fully opt-in, preview before sending | ✅ | |
| Live-task data | ✅ | Direction, hearing or vision, the judgment, and vehicles that never came. |
| Link from the instructor that triggers a send prompt | ⬜ | Not built. |
| Self-voiced confirmation of what is sent | ✅ | With self-voicing on, the app reads its messages aloud. |

## Full accessibility

| Item | Status | Notes |
|---|---|---|
| VoiceOver and TalkBack | 🟡 | Built for it throughout. **A real-device pass is still outstanding.** |
| Easy flows for emerging skills; no rotor required | ✅ | One button per activity; full-width answers; focus placed for you; self-voicing; Siri. |
| Screen readers silent during replays | ✅ | |
| Reflow to 300% | ✅ | |
| High contrast and themes | ✅ | |
| Leaving mid-activity | ✅ | Cancels the activity and closes any gesture pad. |
| Battery | 🟡 | No timers run while idle; no microphone. No battery-saver toggle. |

---

## Still open

1. **Real-device checks**: sound and haptics on an iPhone on iOS 27; VoiceOver and TalkBack passes by skilled users; JAWS if the website is offered for laptops.
2. **App name**: under discussion.
3. **Roadside audio check** of the feedback sounds.
4. **Direct Touch**: not possible in a web view; a native gesture surface is a possible later build.
5. **Cindi's fourth comparison step** (from her first review).
6. **Per-street profiles**: several streets by name rather than one set of times.
7. **App Store and Play Store**: currently TestFlight and a direct APK.
