# Demo Script — Showing Gap Sense in 10 Minutes

For whoever demonstrates the app to a colleague, supervisor or stakeholder.
Exact button names are in **bold**. Read it once before the meeting; keep it
open on a laptop during it.

---

## Before the meeting

- [ ] Gap Sense installed on your own phone (the native app, not Safari).
- [ ] Volume at about two-thirds. The silent switch position does not matter.
- [ ] Open the app once so the first-run notice ("Before you start") and the
      sound tutorial are already dismissed.
- [ ] If you want the other person to hold a working copy during the demo, see
      **Getting it onto a second phone** at the end. Do that part first.

---

## 1. The idea, in 30 seconds

Say:

> "When you cross a street with no signal, the question is: do I have enough
> time before that car reaches me? To answer it you need to know how long your
> own crossing takes, not as a number of seconds, but as a feeling. Sighted
> people get this from watching. Gap Sense builds that feeling through sound and
> vibration. It never shows a number. It is used with an O&M Specialist; it
> does not replace one."

---

## 2. Unlock it with example times (20 seconds)

On the home screen, under the four numbered parts, tap
**Try it now with example times**.

Say:

> "Normally the O&M instructor times the person's crossing and sets the times
> in the app, or sends them a link. For a demo I am loading example times:
> four seconds for the first half of the street, eight for the full street.
> The app says out loud that these are examples, not mine."

The app opens the practice screen.

---

## 3. Practice my timing, the core of the app (3 minutes)

Hold the phone so they can hear it.

1. Tap the big button. It reads **BEGIN**. Say: "I am stepping off the curb."
2. Wait about four seconds. Tap again. It now reads **MARK**. Say: "I think I
   have reached the middle."
3. Wait about four more seconds. Tap again. Say: "I think I have arrived."
4. The button reads **REPLAY** and the playback starts by itself.

Then explain what they heard:

> "You heard my taps as my own sound. Then at each correct moment, either a
> short bright chime, meaning I was within half a second, or a long low buzz,
> meaning I was outside it. What matters is the distance between my tone and the
> reference tone. If they land together, I was on time. The further apart, the
> further off I was. That distance is the lesson. Nobody counts."

Do it twice more, once deliberately early, once deliberately late, so they hear
the chime and the buzz in contrast.

---

## 4. Vibration for DeafBlind users (2 minutes)

Tap the **person** icon (Accessibility). **Vibrate on cue** is on by default.
Tap **Test haptic pulse** and hand them the phone.

Say:

> "Three signals by touch alone. One heavy knock: your own tap. Three knocks:
> within the margin. One long buzz, almost half a second: outside it. For a
> DeafBlind user this is the whole interface. Apple does not allow vibration
> from a web page on iPhone, which is the single reason this had to become an
> installed app."

Point out the output modes while you are here: **Audio only**, **Audio and
visual**, **Visual only**. The text-size and color options. And **Speak
directions aloud**, which makes the app read its own directions for people
still learning VoiceOver.

---

## 5. The other three parts, described not performed (2 minutes)

Go back to the home screen.

- **Where the times come from**: "In real use the instructor times at least
  three crossings, uses the longest, and sets the times in **Instructor
  setup**, or sends a link. The app never asks the student to measure."
- **Comparison preparation**: "Same skill, but the app starts the clock. Press
  Ready, the app says 'Get ready', then a steady sound starts like a car. Stop
  it when your crossing time is up. At a curb nobody hands you the start." If
  there is time, do one round.
- **Comparison practice**: "The app plays a sample warning time as one steady
  sound. The user says whether it is longer than, about the same as, or shorter
  than their own crossing, on a full-screen pad: swipe up, swipe down, or tap.
  They hear at once if they were right. Then the sample replays with their own
  sound where their crossing time ends, so they feel the difference. This can
  be practiced anywhere. A note reminds them that longer does not mean long
  enough." If there is time, tap **Play a sample warning time** and do two
  rounds.
- **At the street**: "Standing where the instructor places them, the user
  swipes left or right toward the side a car comes from the moment they think
  they detect it, and taps when it passes in front of them. Then they judge
  longer, shorter or about the same themselves. The app does not give the
  answer first. They mark whether they used hearing or vision." 

---

## 6. Progress, sharing and privacy (1 minute)

- **Progress**: practice history, kept on the phone only. **Send my progress
  to my instructor** shows the report, then opens the phone's share menu.
- **Instructor setup**: the instructor enters the times and chooses which
  activities and options the student sees, as on, off or student's choice.
  **Share the setup link** or **Text it to the student** sends it all as one
  link. It carries a short student code, never a name.
- **Siri**: "Practice my timing in Gap Sense" opens that activity directly.
- No account, no sign-in, no network, no microphone.

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
stop learning the duration in their body, and at a real curb they will not be
counting. The distance between the sounds teaches the duration directly.

**"How accurate are the sounds?"** Playback is scheduled by the audio engine to
the millisecond. The margin is the tolerance; the instructor chooses it. There
is an experimental option that tightens it as someone improves, off by default.

**"Does it work in the browser?"** Everything except vibration. On iPhone,
Safari cannot vibrate at all. That is why there is a native app.

**"What data do you collect?"** None. Everything stays on the phone. If a
participant wants to share results, the app shows them the message and they
send it themselves through the share menu.

**"How will participants install it?"** iPhone: a TestFlight link, about two
minutes. Android: a download link to the app file. There is a one-page install
guide for each.

---

## Getting it onto a second phone today

**Android.** Send the download link <https://github.com/meazizul/Gap-Sense-Crossing-Practice/releases/download/v1.0-build7/GapSense-android-debug.apk>. They open it, allow
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
