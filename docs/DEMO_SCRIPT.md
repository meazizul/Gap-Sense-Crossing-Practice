# Demo Script — Showing Gap Sense in 10 Minutes

For whoever demonstrates the app to a colleague, supervisor or stakeholder.
Exact button names are in **bold**. Read it once before the meeting; keep it
open on a laptop during it.

---

## Before the meeting

- [ ] Gap Sense installed on your own phone (the native app, not Safari).
- [ ] Volume at about two-thirds. The silent switch position does not matter.
- [ ] Open the app once so the first-run tutorial is already dismissed.
- [ ] If you want the other person to hold a working copy during the demo, see
      **Getting it onto a second phone** at the end. Do that part first.

---

## 1. The idea, in 30 seconds

Say:

> "When you cross a street with no signal, the question is: do I have enough
> time before that car reaches me? To answer it you need to know how long your
> own crossing takes, not as a number of seconds, but as a feeling. Sighted
> people get this from watching. Gap Sense builds that feeling through sound and
> vibration. It never shows a number."

---

## 2. Unlock it with example times (20 seconds)

On the home screen, under the four numbered parts, tap
**Try it now with example times**.

Say:

> "Normally the user measures their own crossing first. For a demo I am loading
> example times: 4 seconds to clear the near lane, 8 seconds for the full
> street. The app says out loud that these are examples, not mine."

The app opens the practice screen.

---

## 3. Practise my timing, the core of the app (3 minutes)

Hold the phone so they can hear it.

1. Tap the big button. It reads **BEGIN**. Say: "I am stepping off the kerb."
2. Wait about four seconds. Tap again. It now reads **MARK**. Say: "I think I
   have reached the middle."
3. Wait about four more seconds. Tap again. Say: "I think I have arrived."
4. The button reads **REPLAY** and the playback starts by itself.

Then explain what they heard:

> "You heard my taps as plain tones. Then at each correct moment, either a
> short bright chime, meaning I was within half a second, or a long low buzz,
> meaning I was outside it. What matters is the gap between my tone and the
> reference tone. If they land together, I was on time. The further apart, the
> further off I was. That gap is the lesson. Nobody counts."

Do it twice more, once deliberately early, once deliberately late, so they hear
the chime and the buzz in contrast.

---

## 4. Vibration for DeafBlind users (2 minutes)

Tap the **person** icon, then **Accessibility**. Turn on **Vibrate on cue**.
Tap **Test haptic pulse** and hand them the phone.

Say:

> "Three signals by touch alone. One heavy knock: your own tap. Three knocks:
> within the margin. One long buzz, almost half a second: outside it. For a
> DeafBlind user this is the whole interface. Apple does not allow vibration
> from a web page on iPhone, which is the single reason this had to become an
> installed app."

Point out the output modes while you are here: **Audio only**, **Audio and
visual**, **Visual only**. And the text-size and colour options.

---

## 5. The other three parts, described not performed (2 minutes)

Go back to the home screen.

- **Measure my crossing**: "In real use, the person walks the actual street
  three times, tapping at the kerb, the middle and the far side. The app stores
  the average. That replaces the example times."
- **Compare practice**: "The app plays a car's warning time as a sound. The user
  says whether it is shorter than, about the same as, or longer than their own
  crossing. Shorter means do not go. This can be practised anywhere."
  If there is time, tap it and do two rounds.
- **At the street**: "From a safe spot, the user taps when they first hear a
  car and again when it passes. The app says whether that car left enough time.
  It samples background noise first, because in noise you hear cars later, and
  it flags measurements taken in a noisy moment."

---

## 6. Progress, sharing and privacy (1 minute)

- **Progress**: practice history, kept on the phone only.
- **Settings → Share time settings**: an instructor measures a student's times
  once and sends a link. Opening it writes the times into the student's copy.
- No account, no sign-in, no network. The microphone is only used to measure
  loudness, never recorded.

---

## 7. Where the project stands (30 seconds)

> "The iPhone build has passed Apple's Beta App Review. One public TestFlight
> link installs it on any iPhone in about two minutes. The Android build is
> ready as a file. The participant guide, install guide and facilitator script
> are written."

The link: <https://testflight.apple.com/join/wYreYpF6>

---

## Questions you may get

**"Why not just show seconds?"** Counting replaces feeling. People who count
stop learning the duration in their body, and at a real kerb they will not be
counting. The sound gap teaches the duration directly.

**"How accurate are the sounds?"** Playback is scheduled by the audio engine to
the millisecond. The margin, half a second by default, is the tolerance, and it
can be tightened as someone improves.

**"Does it work in the browser?"** Everything except vibration. On iPhone,
Safari cannot vibrate at all. That is why there is a native app.

**"What data do you collect?"** None. Everything stays on the phone. If a
participant wants to share results, the app shows them the message and they
send it themselves.

**"How will participants install it?"** iPhone: a TestFlight link, about two
minutes. Android: a download link to the app file. There is a one-page install
guide for each.

---

## Getting it onto a second phone today

**Android.** Send the download link <https://github.com/meazizul/Gap-Sense-Crossing-Practice/releases/download/v1.0-build1/GapSense-android-debug.apk>. They open it, allow
installs from that source once, and tap **Install**. Two minutes.

**iPhone, before the TestFlight review is approved.** Two routes:

1. **Internal tester**, no cable, about five minutes, needs their Apple ID
   email. In App Store Connect, **Users and Access → +**: enter their name and
   Apple ID email, choose the **Developer** role, tick the Gap Sense app, send
   the invitation. They accept the email, install **TestFlight** from the App
   Store and sign in. Gap Sense appears, because the internal **Research Team**
   group already holds the build and distributes automatically. Internal
   testing does not wait for Beta App Review.
2. **Cable from the development Mac**, about five minutes, no Apple ID needed.
   Their iPhone must have **Developer Mode** on (Settings → Privacy & Security →
   Developer Mode, then restart). Plug it in, tap **Trust**, and the build is
   installed directly. It stays valid for a year.

**iPhone.** Send them the TestFlight public link <https://testflight.apple.com/join/wYreYpF6>.
They install TestFlight from the App Store if they do not have it, open the
link, tap Accept, tap Install. Two minutes. The internal-tester and cable
routes below are no longer needed.
