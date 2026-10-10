# Testing Guide — Gap Sense: Crossing Practice

Step-by-step procedures for verifying the app, with pass/fail criteria. Written
so someone who has never seen the project can work through it start to finish.

---

## Quick start (2 minutes, any computer)

```sh
cd ios-app
npm run lan
```

Open the printed `http://localhost:8000/` address.

Then:
1. Open **Settings** (gear icon) → enter `4`, `8`, `0.4` → **Close**.
2. Choose mode **Start → Halfway**.
3. Press **BEGIN**, count "one-thousand-one … one-thousand-four", press **MARK**.
4. Listen to the replay.

**Pass:** you hear your two taps, then a bright chime at the 4-second mark
(because you were close). No console errors.

---

## Test environments and what each can prove

| Environment | Setup effort | Can verify | Cannot verify |
|---|---|---|---|
| **Desktop browser** | None | Layout, themes, text scaling, dialogs, logic, share links | Real audio quality, haptics, touch |
| **iPhone via Safari** | 2 min | Everything above, plus touch, real speaker, VoiceOver | Haptics (impossible on iOS web) |
| **iOS Simulator** | Xcode | Native shell, splash, layout at exact device sizes | Audio quality, haptics |
| **iPhone, native app** | ~15 min | **Everything**, including haptics and the ringer switch | — |

Setup for the phone and Xcode paths: [`../ios-app/README-IOS.md`](../ios-app/README-IOS.md)

---

## A. Core practice flow

**Setup:** clear `4`, full `8`, margin `0.4`.

### A1 — Two-waypoint run
1. Mode: **Start → Halfway**.
2. Press **BEGIN**. → Button turns indigo, reads **MARK**, shows ●.
3. Wait ~4 seconds. Press **MARK**.
4. Replay begins automatically.

**Pass:**
- [ ] Button label goes Begin → Mark → Replay
- [ ] Banner reads "Press Mark for Halfway." after Begin
- [ ] Replay plays your taps, then a **bright chime** near the 4s mark
- [ ] App resets itself to **BEGIN** afterward

### A2 — Deliberately late (the "outside" cue)
Repeat A1 but wait ~8 seconds before pressing Mark.

**Pass:**
- [ ] Replay plays a **low, longer, buzzing pulse** instead of the chime
- [ ] It is unmistakably different from A1's chime
- [ ] Banner shows "Reference: outside tolerance for Halfway."

### A3 — Three-waypoint run
Mode **Start → Halfway → Finish**. Tap at roughly 0s, 4s, 8s.

**Pass:**
- [ ] Three taps accepted; replay only starts after the third
- [ ] Button color/shape changes at each stage (indigo → orange → green)
- [ ] Two feedback cues in the replay, one per waypoint

### A4 — Setup guard
Clear both time fields in Settings, then close.

**Pass:**
- [ ] A **"Times needed"** prompt appears on the main screen
- [ ] Pressing BEGIN does **not** start a run
- [ ] Tapping "Open Settings to enter times" opens Settings with the cursor in the
      first empty field

---

## B. Audio

Do **B1 outdoors**, near real traffic. It is the single most important test in
this document, and it cannot be done at a desk.

### B1 — Roadside audibility ⭐
Take a phone outside near moving traffic, at normal volume. Run a practice with
one accurate and one badly-late waypoint.

**Pass:**
- [ ] Both cues are audible over traffic
- [ ] The chime and the pulse are **clearly different from each other**
- [ ] Neither sounds distorted, buzzy-in-a-broken-way, or clipped

> Background: the outside pulse was retuned from a 240–260 Hz fundamental up to
> 294–349 Hz precisely because small phone speakers roll off below ~300 Hz — the
> old cue was partly lost inside the speaker. This test confirms that fix on real
> hardware.

### B2 — Ringer switch (native app only)
Flip the physical silent switch **on**. Run a practice.

**Pass:** sounds still play.

If they stop, the `AVAudioSession` configuration in
`ios-app/ios/App/App/AppDelegate.swift` is not taking effect.

### B3 — Overlap does not clip
Set margin to `2.0` so accuracy is easy, and tap close to the reference time. Your
marker tone and the feedback cue will land nearly together.

**Pass:** the combined sound stays clean — no crackle. (This is the master
limiter doing its job.)

### B4 — Sound previews
Settings → Sound calibration → each **Play …** button, and **Hear my marker
sound**.

**Pass:** every button plays; A and B options are distinguishable.

---

## C. Haptics

Full detail in [`HAPTICS.md`](HAPTICS.md).

### C1 — Backend detection
Accessibility → read the note under **Test haptic pulse**.

**Pass:** the note matches reality — "Native haptics active" only in the native
app; "No haptics on this browser" in iOS Safari.

### C2 — Test pulse (real device, native app)
Tick **Vibrate on cue** → **Test haptic pulse**. Hold the phone loosely.

**Pass:** three *distinct* sensations — one heavy knock (marker), three heavy
knocks (within margin), one long buzz of about half a second (outside). On
Android web: 45 ms, 35-45-35-45-35 ms, 240 ms.

### C3 — Haptics during practice
Enable vibration, run A1 and A2.

**Pass:**
- [ ] A pulse on every **Mark** tap
- [ ] A different pulse at each replay feedback moment
- [ ] The "outside" pulse feels heavier than the "acceptable" one

### C4 — DeafBlind configuration ⭐
Output mode → **Visual only** (silences audio) + vibration on. Run a practice.

**Pass:** every event is still felt. This is the configuration the feature exists
for.

---

## D. Accessibility

### D1 — Text at 300% ⭐
Accessibility → Text size → **Maximum (300%)**.

**Pass:**
- [ ] No text clipped or overlapping
- [ ] Layout reflows to single columns
- [ ] Every control still reachable by scrolling
- [ ] In dialogs, the **Close** button stays visible (sticky header)

Repeat at 200% and 250%.

### D2 — All four themes ⭐
Try System, Light, Dark, Inverted — **and** set your OS to dark mode, then choose
**Light** in the app.

**Pass:** all text readable against its background in every combination. No white
text on white, no white on light teal.

> This combination is specifically called out because both failures existed
> historically: white-on-teal in dark mode failed WCAG at ~1.8:1, and forced Light
> mode under a dark OS produced invisible white-on-white buttons.

### D3 — High contrast
Enable **High contrast**.

**Pass:** pure black/white, all gradients flattened, everything still legible.

### D4 — VoiceOver ⭐ (real device)
iOS **Settings → Accessibility → VoiceOver → On**. Navigate the app by swiping.

**Pass:**
- [ ] Page announces the app heading first
- [ ] Progress markers announce as one summary, e.g. "Progress markers: Start
      complete, Halfway current"
- [ ] Radio groups announce their group name ("Acceptable (within tolerance)")
- [ ] Opening a dialog moves focus to its title; closing returns focus to the
      button that opened it
- [ ] **During replay, VoiceOver stays quiet** — it must not talk over the tones

**Also record, as a design finding rather than a bug:** with VoiceOver on,
activating a button needs a double-tap. Does that added latency degrade marking
accuracy? This is an open question about the interaction model for a
timing-measurement app, not a defect in the code.

### D5 — Visual-only mode
Output mode → **Visual only**. Run a practice.

**Pass:**
- [ ] No sound at all
- [ ] Screen goes black during replay
- [ ] Grey flash on your taps
- [ ] **Green circle** = acceptable, **orange triangle** = outside
- [ ] Shapes differ by *shape*, not only color

### D6 — Reduced motion
Enable iOS **Reduce Motion**.

**Pass:** the button flash effect is suppressed; everything still functions.

---

## E. Persistence and sharing

### E1 — Settings survive restart
Set times, close the app fully, reopen.

**Pass:** times, theme, text size, and sound choices are all retained.

### E2 — Share link round trip
1. Settings → fill **Instructor email** and a **Client code** → **Share time
   settings**.
2. Copy the **setup message**, open its link on another device or browser.

**Pass:** the second device receives both crossing times, the margin, the
instructor email and the client code (upper-cased), shows "Time settings
updated for this device.", and Home reads "Crossing times set" with no
example-times note.

### E3 — Corrupted link is rejected
Take a setup link and change one character in the middle of the token. Also try
a link whose client code is longer than 8 characters or whose email is not an
address (build one with `buildShareTimingLink()` after typing bad values).

**Pass:** the app reports "This time settings link is invalid." and does **not**
apply any value. (The token carries a checksum, and every field is validated.)
A link made by the September build (version `v1`) still imports.

---

## F. Native iOS shell

### F1 — Launch
**Pass:** splash (crossing glyph on teal gradient) → app loads within ~2s. A
brief blank moment during the transition is normal.

### F2 — App identity
**Pass:** home-screen icon shows the crossing glyph; label reads **Gap Sense**.

### F3 — Safe areas
On a notch/Dynamic Island device, in both orientations.

**Pass:** no content hidden behind the Dynamic Island or the home indicator.

### F4 — Backgrounding
Start a practice, background the app mid-run, return.

**Pass:** the app recovers to a usable state; no stuck overlay or frozen button.

---

## G. Regression checks

Three bugs were fixed in the iOS build. Confirm they stay fixed.

### G1 — Marker cue fires
Enable vibration (or watch the banner). Tap **Mark** mid-practice.

**Pass:** a cue fires on the tap itself, not only during replay.
*(Was: the `marker` cue was defined but never emitted — tapping Mark produced
nothing.)*

### G2 — Banner shows both facts
After a mid-run Mark tap, read the banner.

**Pass:** it reads e.g. **"Halfway marked. Press Mark for Finish."**
*(Was: "Marker recorded" was written and then overwritten on the next statement,
so it was never readable.)*

### G3 — Progress markers reach the screen reader
With VoiceOver on, focus the progress markers row.

**Pass:** it announces the full summary.
*(Was: the container carried `aria-hidden="true"`, so the carefully computed label
was discarded.)*

---

## H. The activities after Cindi's review (10 Oct 2026)

### H1 — Practice logs and score line
Settings 4 / 8 / 0.4. Home → **Practise my timing** → Begin, Mark after about
four seconds.

**Pass:**
- [ ] After the replay the line under the button reads "Last 1: 1 within margin · margin 0.40s"
- [ ] Progress shows the attempt and one dot in the run strip
- [ ] Settings and Accessibility are enabled again
- [ ] Begin, then **Back** mid-run: Settings and the mode radios are enabled on Home; nothing was recorded

### H2 — Time it from a signal
Home → **Time it from a signal** → **READY**.

**Pass:**
- [ ] The button reads WAIT, then after a random pause two blips sound (and a pulse with vibration on) and it reads NOW
- [ ] Pressing after about the crossing time replays your press against the crossing time, with the chime
- [ ] Pressing before the signal says "Too early", resets to READY, records nothing
- [ ] **Longer waits before the signal** makes the wait noticeably longer
- [ ] Leaving the screen while waiting cancels the pending signal

### H3 — Compare practice
Home → **Compare practice** → **Play a sample warning time**.

**Pass:**
- [ ] The sample grows louder and stops; then the three buttons and the answer pad become active, and (with a screen reader) focus is on **About the same**
- [ ] After any answer the status says what it was, then the replay plays: marker, sample, marker, feedback cue at the crossing time
- [ ] Nothing starts by itself; **Play** is needed for the next sample
- [ ] Swipe up on the pad = longer, swipe down = shorter, tap = about the same; a swipe never also counts as a tap
- [ ] **Two taps with silence between** changes the sample
- [ ] **Sample loudness** changes the preview and the next sample, and survives a reload
- [ ] **Start the sample after a short random pause** delays the sample
- [ ] **After answering, tap out how much…**: after the answer you tap start and end, then hear the comparison replay and then your estimate against the real difference
- [ ] Pressing Play during a trial restarts cleanly; leaving mid-trial cancels and the next visit starts idle
- [ ] Nowhere on the screen does the word "gap" appear

### H4 — At the street ⭐ (outdoors, real traffic)
Home → **At the street** → set direction → time a vehicle.

**Pass:**
- [ ] With the noise check off (default) no microphone permission is requested and the system microphone indicator never appears
- [ ] Tap on detection, tap again as it passes → verdict (enough / too close / not enough), then the overlapped replay
- [ ] "Approaching from the right" compares against the full-street time
- [ ] **Cancel** discards the trial and records nothing
- [ ] Switch on **Check background noise while timing**: permission is asked once; **Sample the quiet** becomes available and completes
- [ ] Leaving the screen closes the microphone (indicator goes away); switching the check off closes it too
- [ ] Starting a measurement next to a loud noise, with a quiet level recorded, flags it

### H5 — Share link v2 and report
See E2/E3 for the link. Then Progress → **Show me what would be sent**.

**Pass:**
- [ ] The report starts with "Client code: …" and contains no name
- [ ] Live vehicles read as verdicts ("warning time … — not enough warning"), never "incorrect"
- [ ] **Email it to my instructor** appears only when an instructor email is set, and opens the mail app with the report
- [ ] **Copy report** puts it on the clipboard; **Delete all my practice history** empties everything

### H6 — Adaptive margin (experimental)
Progress → tick **Adaptive margin of error**. Do ten practice attempts on one crossing.

**Pass:**
- [ ] Nothing changes before the tenth attempt; after it, the margin shown for that lane (and only that lane) is 8% tighter
- [ ] Ten poor attempts in a row return it to the Settings margin
- [ ] It never goes below 0.10 s or above the Settings margin
- [ ] **Reset adaptive margins** clears every lane
- [ ] Practice, the signal activity and Compare each show "(adaptive)" in their score line

### H7 — Gating
Clear both times in Settings, then open Home.

**Pass:** all four steps are dimmed and their buttons disabled; the "Start here"
box offers **Open Settings**.

---

## I. Automated tests

From `ios-app/`:

```sh
npm install        # once
npm test           # Playwright, in the Google Chrome installed on the Mac
```

Thirty-eight browser tests cover: boot with no console errors, every screen and
dialog, the demo link, Practice logging and per-lane margins, leaving mid-run,
screen-reader announcement order, Compare (no auto-advance, replay, swipe and
arrow keys, random pause, how much, cancel, restart, trial consistency), Time it
from a signal (on time, false start, leaving), At the street (verdicts,
microphone closed by default, noise check on/off, the permission race), share
link v2 and rejected links, the report wording, deleting data, the adaptive
maths, and the visual-only / 300% / high-contrast / reduced-motion
configuration.

They cannot hear or feel anything. Still manual, on a real phone: B1 roadside
audio, B2 ringer switch, every test in C, D4 VoiceOver, F, and H4 outdoors.

---

## Reporting a problem

Please include:

1. **Which environment** — desktop browser / iPhone Safari / simulator / native app
2. **Which test** — e.g. "B1"
3. **Expected vs actual**
4. **Settings in use** — clear, full, margin, mode, output mode
5. **Console output** if on desktop (⌥⌘J in Chrome)
6. Device and OS version for phone issues
