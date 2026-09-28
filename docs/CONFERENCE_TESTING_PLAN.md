# Conference Testing Plan

How to get Gap Sense onto ~100 participants' phones per session, when many of
those participants are blind and using VoiceOver or TalkBack.

---

## The key realisation

**For a blind participant, the fastest install is no install.**

The app is a web app. It opens in a browser and runs immediately. There is
nothing to download, no account, no App Store, no permissions dialog.

So the question is not "how do we install it quickly" — it is **"how do we get a
tappable link into their hands"**.

That reframing matters, because the obvious answers are wrong for this audience:

| Method | Good for a blind participant? |
|---|---|
| QR code | ❌ Poor. Aiming a camera at a code you cannot see is hard. |
| Reading a long URL aloud | ❌ Poor. Too long to type accurately. |
| App Store search | ❌ Not published, and slow even if it were. |
| **A link they tap in email or SMS** | ✅ **One tap. Fully accessible.** |

---

## Recommended plan: three tiers

### Tier 1 — Everyone, from day one: the web link

**Link to hand out:**

```
https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1
```

The `?demo=1` part matters. It loads example crossing times and opens straight
into the practice screen, so the participant can press the button **immediately**.
Without it they land on a setup screen and have to measure a crossing or type in
two numbers first — which kills a 30-second trial.

**How to deliver it:**

1. **Best — email it to registered attendees before the session.** They open their
   mail app, tap the link, and the app is running. This is genuinely about ten
   seconds with VoiceOver, and it works on every phone.
2. **In the room — say a short URL aloud** (see "Shorten the link" below). Blind
   participants can type a short URL reliably; a long one they cannot.
3. **On the handout — a QR code** for sighted attendees and instructors.
   Generated for you at `ios-app/handout/gapsense-demo-qr.png`.

**What works on this tier:** everything except vibration on iPhone. All sounds,
the visual replay, all four activities, every accessibility setting, text to
300%, VoiceOver and TalkBack.

**Vibration:** works on **Android** browsers. Does **not** work in Safari on
iPhone — Apple has never implemented the web Vibration API, and no web workaround
exists. That is what Tier 2 is for.

**Optional extra:** after opening the link, iPhone users can do
**Share → Add to Home Screen** to get an app icon and full-screen mode. Useful,
but not required, and adds about six VoiceOver swipes — so treat it as a bonus,
not part of the 30-second path.

### Tier 2 — iPhone haptics: TestFlight

> **See [`HAPTICS_DISTRIBUTION.md`](HAPTICS_DISTRIBUTION.md) for the full
> haptics-focused version of this, including the Android web-vibration test to
> run first and the exact TestFlight setup steps.**


This is the only way to give iOS haptics to people who are not you.

**What it costs and takes:**

- Apple Developer Program: **$99/year**
- Enrolment approval: usually 24–48 hours, sometimes longer
- First build then needs **Beta App Review**: typically 1–2 days
- After that, you get a **public TestFlight link** anyone can use, up to 10,000
  testers

**Start this now.** The lead time is the reason — not the work, which is small.

**What a participant does:**

1. Tap your TestFlight link
2. If they do not have the TestFlight app, the App Store opens — install it (free)
3. Tap **Accept**, then **Install**

About 60–90 seconds if TestFlight is already installed, 2–3 minutes if not.
Slower than the web link, but this is the group who specifically want to feel the
haptics.

**Worth knowing:** TestFlight builds expire after 90 days, so upload a fresh
build near the conference date.

### Tier 3 — Android native: probably not worth it

Android browsers already vibrate, so the web link covers most of the benefit.

A Play Store listing would be better still, but Google now requires new personal
developer accounts to run a closed test with 12 testers for 14 days before they
can publish publicly. That is a lot of process for a marginal gain. Skip it
unless you have an organisation account already.

---

## Do this first: shorten the link

`azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1` is **44 characters**. Nobody
can type that from hearing it once, and dictating it is painful.

You own `azizulhaque.me`, so you can make something like:

```
azizulhaque.me/gap
```

**How:** in your `meazizul.github.io` repository, create a file at `gap/index.html`
containing:

```html
<!doctype html>
<meta http-equiv="refresh"
      content="0; url=https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1">
<link rel="canonical" href="https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1">
<p>Opening Gap Sense… <a href="https://azizulhaque.me/Gap-Sense-Crossing-Practice/?demo=1">Continue</a></p>
```

That is the single highest-value thing you can do for in-room distribution. Say
"azizulhaque dot me slash gap" from the stage and people can actually type it.

Avoid bit.ly and similar: the random characters are worse to dictate than a short
path on your own domain, and the link dies if the service does.

---

## Session-day checklist

**Before the session**

- [ ] Email the link to registered attendees, with one line: *"Tap this to try the app during the session — nothing to install."*
- [ ] Short URL working and tested on a phone that has never opened it
- [ ] Fresh TestFlight build uploaded (if using Tier 2)
- [ ] Handout printed with the short URL in large print, plus the QR code
- [ ] A Braille or large-print card with the short URL, if the venue can produce one
- [ ] Your own phone tested with VoiceOver on, from a cleared browser

**In the room**

- [ ] Say the short URL twice, slowly, and spell it once
- [ ] Say clearly: *"You do not need to install anything."*
- [ ] Have 2–3 spare phones with the app already open, for anyone who cannot get it working
- [ ] Mention that iPhone users who want to feel the vibration need the TestFlight version, and explain why in one sentence

**A useful line for the room:**

> "Safari on iPhone cannot vibrate — Apple has never allowed it. That single
> limitation is why this needed to be a real app, because for a DeafBlind
> traveller vibration is the only channel left."

That is both true and a good demonstration of why the work matters.

---

## Have a plan for no Wi-Fi

Conference Wi-Fi fails. The app is built for this.

Once opened, it caches itself and **works fully offline**. So:

- Ask people to open the link **before** the session, while they still have signal
- Once loaded, it keeps working with no connection
- Bring a phone hotspot as backup for anyone who missed it

---

## What to ask participants to try

Thirty seconds is enough for one thing. Make it the right one.

**The 30-second demo:**
1. Press the big button.
2. Wait, imagining yourself crossing.
3. Press it again when you think you would have arrived.
4. Listen to the gap between your tap and the reference sound.

That single loop communicates the whole idea. Everything else — measuring,
comparing gaps, live traffic — can wait for people who want to go deeper.

**If they have longer:** send them to Help → Run the sound tutorial first, so the
sounds mean something before they start.

---

## Collecting feedback

The app stores nothing about participants and sends nothing anywhere, so you will
need to collect feedback separately. Worth asking:

- Could you hear the difference between the two feedback sounds?
- Was the "outside" sound clearly different from the "close enough" one?
- Did you find yourself counting? (If yes, that is a design problem for us.)
- Was anything confusing with VoiceOver or TalkBack?
- For anyone who used the TestFlight build: could you feel the difference between
  the vibration patterns?

A short accessible form — plain HTML, or a Google Form tested with a screen
reader — collected afterwards by email will get better responses than anything
handed out on paper.

---

## Summary

| | Method | Time | Haptics | Effort for you |
|---|---|---|---|---|
| **Everyone** | Web link, emailed | ~10 s | Android only | None — it is live now |
| **iPhone + haptics** | TestFlight public link | ~90 s | ✅ Yes | $99 + a few days lead time |
| **Android native** | Play open testing | ~60 s | ✅ Yes | Not worth it — web already vibrates |

**Start the Apple Developer enrolment now if you want iOS haptics tested at the
conference.** Everything else is already working.
