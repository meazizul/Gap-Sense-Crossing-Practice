# App Guide — Gap Sense: Crossing Practice

How the app works and how to operate it. Written for someone picking it up for
the first time, including reviewers who are not the intended end user.

---

## 1. The idea

A traveler who is blind or has low vision needs to judge whether the warning
time of an approaching vehicle is long enough to cross. That judgment is a
*felt sense of duration*, and like any physical skill it improves with
calibrated practice and immediate feedback.

This app provides that feedback loop. It does **not** tell the student "you were
1.2 seconds late." It plays back their crossing as rhythm, so the error is felt
in the same modality it will be needed in on the street.

**Design rule that governs everything:** feedback is duration and texture, never
a number.

---

## 1b. Where the crossing times come from

Every activity compares against two reference times: the **first half of the
street** (traffic from the left) and the **full street** (traffic from the
right). These are measured and set by the O&M instructor: time at least three
crossings and use the longest, because if it took that long once it may take
that long again. The instructor enters them in **Settings**, or sends the
student a link that sets them (see section 2). The app does not measure them;
a student pressing buttons while crossing a street cannot do that safely or
precisely.

Until both times exist, all four activities stay locked and the Home screen
says where to get them.

---

## 1c. The four activities

The home screen presents them in the order the skill is taught.

| # | Activity | What you do | Why |
|---|---|---|---|
| **1** | **Practise my timing** | Tap out how long you think the crossing takes | Builds the felt sense of that duration |
| **2** | **Time it from a signal** | Wait for the app's signal, then press when your crossing time is up | The same sense, when you do not choose the start |
| **3** | **Compare practice** | Judge a sample warning time as longer/shorter/same vs your crossing, then feel the difference | The actual safety skill, practised without traffic |
| **4** | **At the street** | Tap when you hear a vehicle, again when it passes | The same judgement against real traffic |

### 2. Time it from a signal

Choose which crossing. Press **READY**. After a random wait (longer waits are
an option) the signal comes: two quick blips, a pulse, and a flash. The button
now reads **NOW**. Press it when you think your crossing time is up. The app
replays your press against the real crossing time exactly as Practice does.
Pressing before the signal is a false start: the app says so and records
nothing.

### 3. Compare practice

Choose which crossing, then press **Play a sample warning time**. The app plays
a sound whose length stands for a vehicle's warning time: from first hearing it
until it passes you. By default the sound grows louder like an approaching
vehicle and then stops; two taps with silence between is the alternative.

Answer one of three ways:

- the three full-width buttons: **Shorter than my crossing**, **About the
  same**, **Longer than my crossing**;
- the answer pad: **swipe up** for longer, **swipe down** for shorter, **tap**
  for about the same;
- on a keyboard, the arrow keys on the pad.

With a screen reader running, focus lands on **About the same** as soon as the
answers open, so one flick in either direction reaches the other two.

After every answer, right or wrong, comes the **replay**: the sample and your
real crossing time start together. You hear a marker at the start, the sample,
a marker where it ends, and the feedback cue where your crossing time ends — a
chime if the two were within the margin, the low pulse if not. The order of
the last two sounds tells you the direction; the distance between them, the
size. Nothing starts by itself: press Play for the next sample.

Under **Options**: the sound style, a **Sample loudness** slider with a
two-second preview, **Start the sample after a short random pause**, and
**After answering, tap out how much longer or shorter it was**. With that last
option on, the app asks you to tap the difference out before the replay; the
replay then plays the comparison, followed by your estimate against the real
difference.

### 4. At the street

Set the direction the vehicle is approaching from: **from the left** compares
against your first-half time, **from the right** against your full-street
time. Then one big button: tap when you first hear it, tap again as it reaches
you. The app gives the verdict — enough warning, too close to rely on, or not
enough — and replays the warning time against your crossing time. **Cancel**
discards the trial if the vehicle turned off or never came.

**Background noise check (experimental, off by default).** Switch on **Check
background noise while timing**, then **Sample the quiet** to record a 3-second
baseline. Measurements started noticeably above that level are flagged, because
a warning time heard over a running engine is not one to rely on. The
microphone is opened only while the check is on and this screen is showing,
closes when you leave, and measures loudness only; nothing is recorded or sent.
Results vary between phones and positions; treat a flag as a hint.

### Progress

Accuracy per activity, a strip showing your recent timing attempts, and the
experimental **adaptive margin** switch (section 2). It also produces a written
report for the instructor — shown to you in full first, never sent
automatically. **Email it to my instructor** opens your mail app with the
report filled in (you still press Send); **Copy report** puts it on the
clipboard. The report carries the client code from Settings, never a name.

---

## 2. Setting up

Open **Settings** (gear icon, top right). Under **Crossing times**:

| Field | Meaning | How to get it |
|---|---|---|
| **First half of the street, traffic from the left (seconds)** | How long this student takes to clear the first half | Instructor times at least three crossings, uses the longest |
| **Full street, traffic from the right (seconds)** | How long to cross the whole street | Same |
| **Margin of error (seconds)** | How close counts as "on time" | Chosen by the instructor. The app starts at 0.4 s; 0.5 s has historically been taught; there is no research yet on the right value |

Until both street times are entered, the activities stay locked. This is
deliberate: the feedback is meaningless without a reference.

> **Try it quickly:** first half = `4`, full street = `8`, margin = `0.4`. Or
> press **Try it now with example times** on the Home screen.

Under **Instructor and client**:

| Field | Purpose |
|---|---|
| **Instructor email** (optional) | Lets the student email the report straight from Progress; travels in the setup link |
| **Client code** (optional) | Letters and digits, up to 8. Identifies the student in links and reports **without a name**, because those travel by ordinary email or text. Use a code that cannot be linked to the person |

### Adaptive margin (experimental)

Off by default; the instructor decides. When on, each activity and street type
keeps its own margin. After every block of ten attempts in that lane: accuracy
of 80% or better tightens the margin by eight per cent; below 60% it goes
straight back to the margin set in Settings; in between it holds. It never
goes easier than the set margin or tighter than 0.10 s. **Reset adaptive
margins** in Progress starts every lane again. The research on the right pace
is not settled, which is why it is marked experimental.

### Sharing a setup with a student

**Settings → Share & debug → Share time settings** produces two messages:

- a **setup message** containing a link that, when opened once, writes the
  crossing times, margin, instructor email and client code into the student's
  copy of the app;
- a **practice message** containing the plain app link to save and reuse.

They are separate so that link previews in iMessage and RCS stay readable. The
setup link carries a version tag and a checksum, so a corrupted or truncated link
is rejected rather than silently applied. Links made by earlier versions of the
app still work.

---

## 3. Practicing

### Choose a mode

| Mode | Waypoints | Use when |
|---|---|---|
| **Start → Halfway** | 2 | Teaching the first-half time |
| **Start → Finish** | 2 | Teaching the whole crossing |
| **Start → Halfway → Finish** | 3 | Full crossing with a midpoint check |

### The tap sequence

The large button is the only control needed while walking.

1. **BEGIN** — tap as you step off the curb. The button changes color, shape,
   and label, and now reads **MARK**.
2. **MARK** — tap at each waypoint as you reach it.
3. After the final tap the button reads **REPLAY** and the feedback plays
   automatically. A line under the button then shows how many of your last
   ten attempts were within the margin.

The button's appearance encodes the current stage four different ways at once —
color, corner shape, border style, and a symbol — so the stage is never
communicated by color alone:

| Stage | Color | Shape | Symbol |
|---|---|---|---|
| Start | Indigo | Square corners | ● |
| Halfway | Orange | Fully rounded | ▲ |
| Finish | Green | Sharp corners | ■ |

Leaving the screen mid-run cancels the run; nothing is recorded and nothing
stays locked.

### Reading the replay

After a short lead-in, the app plays back:

- **Your taps** — a plain marker tone at the moment you tapped.
- **The reference** — at each correct time, either:
  - a **short, bright, high chime** → you were within the margin, or
  - a **longer, low, buzzing pulse** → you were outside it.

The two are deliberately different along three independent dimensions — pitch
register, duration (0.12s vs 0.30s), and texture (pure vs beating/rough) — so
they can never be confused, even through a phone speaker next to traffic.

**What you are listening for is the distance between your tone and the
reference tone.** If they land together, you were on time. The further apart
they sound, the further off you were. That distance is the lesson. The replays
in the other three activities use the same vocabulary.

---

## 4. Accessibility options

Open with the person icon, top right.

### Output mode
- **Audio only** (default) — sounds alone.
- **Audio + Visual** — adds the full-screen visual replay.
- **Visual only** — no sound at all, for Deaf or hard-of-hearing users, or noisy
  environments.

### The visual replay
When enabled, the screen goes black during playback and shows:

| Element | Meaning |
|---|---|
| Grey flash (full screen) | Your tap; in the comparison tasks, held for the length of the sample |
| **Green circle** | Reference: within tolerance |
| **Orange triangle** | Reference: outside tolerance |

Circle vs triangle is a *shape* difference, not just a color one, so it works for
color-blind users. Triangle orientation (up/down) and the grey flash's brightness
are both adjustable under **Settings → Visual calibration**.

### Touch feedback
**Vibrate on cue** plus a **Test haptic pulse** button. See
[`HAPTICS.md`](HAPTICS.md) — this behaves very differently on the native iOS app
than in a browser, and the note under the button always states which is active.

### Vision preferences
- **Theme** — System / Light / Dark / Inverted (yellow on black, for some
  low-vision conditions).
- **Text size** — up to **300%**, at which point the layout reflows to single
  columns so nothing is clipped.
- **High contrast** — pure black and white, all gradients flattened.
- **Focus boost** — thicker focus outlines for keyboard and switch users.

### Screen reader
**Announce cues** controls spoken feedback. Prompts and results are spoken
straight away; announcements are **paused only while a replay plays**, so
VoiceOver does not talk over the timing tones. This is intentional: the tones
are the content.

---

## 5. Training exemplars

**Settings → Training exemplars** plays a *correct* crossing at the configured
times, with no marking required. This lets a student hear the target rhythm
before attempting it. There is one per mode.

---

## 6. Where the settings live

Everything persists on the device in `localStorage` under `om-*` keys. There is
no account, no sync, and no server. Clearing browser data (or deleting the app)
resets everything.

---

## 7. Tuning the sounds

The sound design is data-driven and documented inline for non-programmers. In
`ios-app/www/js/engine.js`, search for:

- **`const TEST_TUNING`** — lead-in delays, end padding, and the four volume
  controls.
- **`const SOUND_PRESET_LIBRARY`** — the named tone families (duration plus the
  frequency/gain layers that shape timbre), including the two-blip
  `reference_tick` used as the start signal.

The sample warning time's partials and rising envelope live in
`ios-app/www/js/comparison.js` (`GS_SAMPLE_PARTIALS`, `gsPlaySample`).

**One rule when editing:** keep the sum of a preset's partial gains at or below
about **0.80**. Above that you are only feeding the master limiter — the output
gets squashed, not louder. Values above `1` in `TEST_TUNING` do the same thing.

---

## 8. Architecture, briefly

- **No build step, no framework.** `ios-app/www/index.html` is the markup,
  `css/app.css` the styles, and five plain scripts share one global scope:
  `js/engine.js` (practice, replay, audio, haptics, share link, settings),
  `js/history.js` (attempt log, adaptive margin, report), `js/comparison.js`
  (Compare and At the street), `js/signal.js` (Time it from a signal), and
  `js/app.js` (screens, Home, Progress, demo mode).
- **Audio** is synthesized on demand with the Web Audio API and scheduled on the
  `AudioContext` clock, which does not drift the way `setTimeout` does. The
  context is created at load and warmed on the first touch so the first tone is
  on time.
- **A master limiter** (`DynamicsCompressorNode`) sits between every tone and the
  output, so a user marker and a feedback cue landing at the same instant — which
  is exactly what happens when the student is *accurate* — cannot clip.
- **The visual replay** runs a `requestAnimationFrame` loop that reads the same
  `AudioContext` clock, keeping picture locked to sound.
- **Classification** (within margin vs outside) happens in one function,
  `classifyMark()`, which feeds audio, visuals, cues, haptics and the attempt
  log from a single decision, so they can never disagree.
- **Every activity can be cancelled.** Changing screen calls each module's
  cancel routine, which clears its timers and haptics, un-suppresses speech,
  unlocks Settings and closes the microphone.
- **Browser tests** live in `ios-app/tests/` and run with `npm test` (Playwright
  in the installed Google Chrome).

**Known architectural caveat:** audio is on the AudioContext clock, but UI stage
changes and haptics still use `setTimeout`. Close enough in practice; on a heavily
loaded device the visuals and haptics can drift slightly from the sound. Driving
everything from the replay timeline is the proper fix and is a larger refactor.
