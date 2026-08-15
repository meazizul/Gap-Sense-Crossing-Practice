# App Guide — Gap Sense: Crossing Practice

How the app works and how to operate it. Written for someone picking it up for
the first time, including reviewers who are not the intended end user.

---

## 1. The idea

A traveler who is blind or has low vision needs to judge whether a gap in traffic
is long enough to cross. That judgment is a *felt sense of duration*, and like
any physical skill it improves with calibrated practice and immediate feedback.

This app provides that feedback loop. It does **not** tell the student "you were
1.2 seconds late." It plays back their crossing as rhythm, so the error is felt
in the same modality it will be needed in on the street.

**Design rule that governs everything:** feedback is duration and texture, never
a number.

---

## 2. Setting up (do this once per street)

Open **Settings** (gear icon, top right). Under **Time entry**:

| Field | Meaning | How to get it |
|---|---|---|
| **Time to clear from left (seconds)** | How long it takes this student to walk clear of the nearest lane | Instructor times it once |
| **Full street time (seconds)** | How long to cross the entire street | Instructor times it once |
| **Acceptable margin of error (seconds)** | How close counts as "on time" | Starts at 0.4s; tighten as the student improves |

Nothing else is required. Until both street times are entered, the main screen
shows a **"Times needed"** prompt and practice is blocked — this is deliberate,
since the feedback is meaningless without a reference.

> **Try it quickly:** clear = `4`, full = `8`, margin = `0.4`.

### Sharing a setup with a student

**Settings → Share & debug → Share time settings** produces two messages:

- a **setup message** containing a link that, when opened once, writes these
  times into the student's copy of the app;
- a **practice message** containing the plain app link to save and reuse.

They are separate so that link previews in iMessage and RCS stay readable. The
setup link carries a version tag and a checksum, so a corrupted or truncated link
is rejected rather than silently applied.

---

## 3. Practicing

### Choose a mode

| Mode | Waypoints | Use when |
|---|---|---|
| **Start → Halfway** | 2 | Teaching the near-lane clear time |
| **Start → Finish** | 2 | Teaching the whole crossing |
| **Start → Halfway → Finish** | 3 | Full crossing with a midpoint check |

### The tap sequence

The large button is the only control needed while walking.

1. **BEGIN** — tap as you step off the curb. The button changes color, shape,
   and label, and now reads **MARK**.
2. **MARK** — tap at each waypoint as you reach it.
3. After the final tap the button reads **REPLAY** and the feedback plays
   automatically.

The button's appearance encodes the current stage four different ways at once —
color, corner shape, border style, and a symbol — so the stage is never
communicated by color alone:

| Stage | Color | Shape | Symbol |
|---|---|---|---|
| Start | Indigo | Square corners | ● |
| Halfway | Orange | Fully rounded | ▲ |
| Finish | Green | Sharp corners | ■ |

### Reading the replay

After a short lead-in, the app plays back:

- **Your taps** — a plain marker tone at the moment you tapped.
- **The reference** — at each correct time, either:
  - a **short, bright, high chime** → you were within the margin, or
  - a **longer, low, buzzing pulse** → you were outside it.

The two are deliberately different along three independent dimensions — pitch
register, duration (0.12s vs 0.30s), and texture (pure vs beating/rough) — so
they can never be confused, even through a phone speaker next to traffic.

**What you are listening for is the gap between your tone and the reference
tone.** If they land together, you were on time. The further apart they sound,
the further off you were. That distance is the lesson.

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
| Grey flash (full screen) | Your tap |
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
**Announce cues** controls spoken feedback. Announcements are automatically
**paused during replay** so VoiceOver does not talk over the timing tones. This
is intentional: the tones are the content.

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
`ios-app/www/index.html`, search for:

- **`const TEST_TUNING`** — lead-in delays, end padding, and the four volume
  controls.
- **`const SOUND_PRESET_LIBRARY`** — the named tone families (duration plus the
  frequency/gain layers that shape timbre).

A plain-English guide comment sits directly above both.

**One rule when editing:** keep the sum of a preset's partial gains at or below
about **0.80**. Above that you are only feeding the master limiter — the output
gets squashed, not louder. Values above `1` in `TEST_TUNING` do the same thing.

---

## 8. Architecture, briefly

- **One file.** `ios-app/www/index.html` holds the CSS, markup, and all logic.
  No build step, no framework.
- **Audio** is synthesized on demand with the Web Audio API and scheduled on the
  `AudioContext` clock, which does not drift the way `setTimeout` does.
- **A master limiter** (`DynamicsCompressorNode`) sits between every tone and the
  output, so a user marker and a feedback cue landing at the same instant — which
  is exactly what happens when the student is *accurate* — cannot clip.
- **The visual replay** runs a `requestAnimationFrame` loop that reads the same
  `AudioContext` clock, keeping picture locked to sound.
- **Classification** (within margin vs outside) happens in one function,
  `classifyMark()`, which feeds audio, visuals, cues, and haptics from a single
  decision, so they can never disagree.

**Known architectural caveat:** audio is on the AudioContext clock, but UI stage
changes and haptics still use `setTimeout`. Close enough in practice; on a heavily
loaded device the visuals and haptics can drift slightly from the sound. Driving
everything from the replay timeline is the proper fix and is a larger refactor.
