# Getting Vibration Into Participants' Hands

The honest answer to: *how do I let a blind or DeafBlind participant install the
app easily, so they can feel the vibration?*

---

## Start here: the one hard constraint

**On iPhone, a web page can never vibrate.** Safari has never implemented the
Vibration API, and no PWA, home-screen shortcut, or workaround changes that. To
vibrate on an iPhone, the app has to be a real installed app.

**On Android, a web page *can* vibrate.** So Android participants may need no
install at all.

That single split determines everything below.

---

## What actually works

| Platform | Method | Participant effort | Vibration | What it costs you |
|---|---|---|---|---|
| **Android** | **Web link** | ~10 s, no install | ✅ Yes | Nothing — live now |
| **iPhone** | **TestFlight link** | ~90 s | ✅ Yes | $99/yr + ~3 days lead |
| **Android** | APK emailed | ~60 s + a scary prompt | ✅ Yes | Free, but poor for strangers |
| **iPhone** | Web link | ~10 s | ❌ **Never** | Nothing |

---

## Do this first (free, today): test Android web vibration

Before spending anything, borrow an Android phone and open:

```
https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1
```

Then: **Accessibility → tick "Vibrate on cue" → Test haptic pulse.**

If you feel three distinct pulses, **Android participants need no install at
all** — the web link already gives them haptics. That is the cheapest, fastest
result available and it costs you nothing.

The note under that button also tells you which backend is live, so you will know
for certain rather than guessing.

---

## For iPhone: TestFlight is the only route

There is no way to email an iPhone user a file they can install. Apple does not
permit it. TestFlight *is* the "email a link, they install it" path for iOS — it
just uses Apple's tester app as the middle step.

### What the participant does

1. Taps your link in their email
2. If they do not have TestFlight, the App Store opens — install it (free, one time)
3. Taps **Accept**, then **Install**

**About 90 seconds** with TestFlight already installed; 2–3 minutes if not.
TestFlight works well with VoiceOver.

### What you do, once

1. **Enrol in the Apple Developer Program** — $99/year, at developer.apple.com.
   Choose **Individual**, not Organization: Organization requires a D-U-N-S
   number and takes much longer. *Approval usually takes 24–48 hours.*
2. **Create the app record** in App Store Connect using the bundle ID already
   configured: `com.gapsense.crossingpractice`
3. **Upload a build** — in Xcode: **Product → Archive → Distribute App →
   TestFlight**
4. **Submit for Beta App Review** — required once, before external testers can
   join. *Usually 1–2 days.*
5. **Turn on the public link** — TestFlight tab → create a group → enable
   **Public Link**. Anyone with that link can join, up to **10,000 testers**. No
   need to collect anyone's email in advance.

**Total lead time: about 3–5 days.** The work itself is perhaps an hour. It is
the waiting that will catch you out, so start the enrolment before anything else.

### Already handled for you

- Bundle ID, app icons, and launch screen are set
- Microphone permission text is written (for the noise feature)
- `ITSAppUsesNonExemptEncryption` is set to `NO`, so the export-compliance
  question will not block every upload
- Deployment target is iOS 15, which Xcode 26 requires

### Keep in mind

TestFlight builds **expire after 90 days**. Upload a fresh one close to the
conference date.

---

## Android native, if web vibration is not enough

The Android project is now scaffolded at `ios-app/android/`, with `VIBRATE` and
`RECORD_AUDIO` permissions declared and the Haptics plugin registered.

**To build it you need Android Studio** (a large download; not installed on this
Mac). Then:

```sh
cd ios-app
npx cap open android
```

Build → **Build Bundle(s) / APK(s) → Build APK(s)**.

Two ways to distribute the result:

**Google Play internal testing — better.** $25 one-time. Up to 100 testers added
by email address, available immediately with no review wait. Installs through the
Play Store, which is familiar and accessible. The 12-testers-for-14-days rule
people mention applies to *publishing publicly*, not to internal testing.

**Emailing the APK — works, but has a rough edge.** The participant taps the
link, downloads, and then Android asks them to allow installing from that source.
That prompt is a security warning, it appears in a different screen, and it is
confusing with TalkBack. It also asks people to trust a file from an email, which
is a habit worth not teaching. Use it only as a fallback.

---

## Recommended plan

**Now, free:**
1. Test Android web vibration on any Android phone (5 minutes).
2. Start the Apple Developer enrolment — the lead time is the bottleneck.

**This week:**
3. Upload a TestFlight build and submit for Beta App Review.
4. Get the public link and test it yourself on a device that has never seen the app.

**At the conference — two links, not one:**

> **To try it:** \<short link\> — opens straight away, nothing to install.
>
> **To feel the vibration on iPhone:** \<TestFlight link\> — takes about a minute.

Send both by email beforehand. Say the short one aloud in the room.

**Only if Android web vibration disappoints:** install Android Studio, build the
APK, and set up Play internal testing.

---

## What participants will feel

This is worth knowing so you can describe it, and so you can tell whether it is
working.

During replay a DeafBlind traveller feels **two separate pulses**:

1. **One short tick** — where *they* tapped
2. **Either three quick ticks** (within the margin) **or one long heavy buzz**
   (outside it) — the correct moment

**The time between those two pulses is the feedback.** Close together means they
were accurate. Far apart means they were off, and the distance tells them by how
much.

This mirrors exactly what a hearing user gets from the two tones. The principle —
feedback as *felt duration*, never as a number — now holds on the skin as well as
in the ear.

> This was genuinely broken until recently: the app vibrated at the reference
> moment but not at the user's own tap, so a DeafBlind user felt a single pulse
> with nothing to compare it against. Fixed, and worth testing specifically.

**To check it works:** turn on vibration, set output to **Visual only** so there
is no sound at all, and run a practice. Everything should still be feelable.

---

## One thing to test with a real DeafBlind participant

Whether the three patterns are actually distinguishable **through a pocket, a
glove, or a cane-holding hand** — not just on a palm in a quiet room.

If they are not, the patterns are one small table in
`ios-app/www/js/engine.js` (search `WEB_VIBRATION_PATTERNS` and `hapticCue`) and
can be retuned in minutes. Native iOS has richer options still — Core Haptics can
vary intensity and sharpness continuously, which would let the *strength* of the
buzz encode the *size* of the error. That is the natural next step if the current
patterns prove too coarse.
