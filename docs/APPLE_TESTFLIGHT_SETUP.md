# Apple Developer & TestFlight — Step by Step

Everything needed to get Gap Sense onto participants' iPhones with working
vibration, in the order to do it.

---

## Before anything: you may not need to pay at all

**Ask Professor Hong whether Stevens already has an Apple Developer Program
membership.** Many universities do, often run by IT or a research computing
group.

If Stevens has one, an Account Holder or Admin can add you to the team in about
two minutes, at **no cost**. You would get a "Developer" or "App Manager" role,
which is enough to upload builds and run TestFlight.

This is worth one email before spending anything. It skips the $99, skips the
1–2 day enrolment wait, and puts the app under the university rather than your
personal name — which is better for a research project that might later be
published or handed on.

**If Stevens does not have one, there are still two routes:**

| Route | Cost | Speed | App belongs to |
|---|---|---|---|
| **Individual** enrolment | $99/year | Fastest — often approved in a day | You personally |
| **Organization** enrolment (Stevens) | **Free** for accredited educational institutions | Slower — needs a D-U-N-S number and verification | Stevens |

Apple waives the fee for accredited educational institutions enrolling as an
organization. Stevens qualifies. But it needs someone with legal authority to
bind the university to sign, plus a D-U-N-S lookup, so it typically takes weeks
rather than days. Only worth it if the conference is far enough away.

---

## Do I have to pay right now?

**Short answer: you can start now for free, but you cannot finish without
paying.**

Here is exactly where the wall is:

| Step | Cost | Can you do it before paying? |
|---|---|---|
| Create an Apple ID | Free | ✅ Yes |
| Create a free Apple Developer account | Free | ✅ Yes |
| Install Xcode, open the project | Free | ✅ Yes |
| Build and run on **your own** iPhone | Free | ✅ Yes — but the app stops working after 7 days |
| **Enrol in the Apple Developer Program** | **$99/year** | ❌ **Payment is taken at enrolment. It cannot be deferred.** |
| Upload to App Store Connect | Included | ❌ Needs the paid membership |
| TestFlight link for participants | Included | ❌ Needs the paid membership |

So: **do steps 1–4 today at no cost.** That gets the app onto your own iPhone so
you can test the vibration yourself, which is the thing you most need to verify
anyway. Then get approval for the $99, and the rest takes about an hour.

There is no trial, no invoice-later, and no student discount on the Program fee.

---

## Something to send Professor Hong

Feel free to copy this.

> To let conference participants test the vibration feedback on iPhone, we need
> an Apple Developer Program membership — $99/year. There is no alternative:
> Safari on iOS cannot vibrate at all, so haptics require a real installed app,
> and TestFlight is Apple's only route for distributing test builds to people
> outside our team.
>
> This matters specifically for DeafBlind participants, for whom vibration is
> the only feedback channel available — they can use neither the audio nor the
> visual output.
>
> Two questions before we buy anything:
>
> 1. Does Stevens already have an Apple Developer Program membership I could be
>    added to? That would cost nothing.
> 2. If not, should we enrol as an individual ($99/year, approved in about a day,
>    registered under my name), or as Stevens (fee waived for accredited
>    educational institutions, but needs a D-U-N-S number and someone authorised
>    to sign, so several weeks)?
>
> Given the conference timing, the individual route is the practical one unless
> Stevens already has an account.

---

## Route A — Individual enrolment (the fast one)

### Step 1. Apple ID with two-factor authentication — free

Use an Apple ID you control long term. Your Stevens address is a good choice if
the account should outlive your studies.

Two-factor authentication is **required**. Turn it on first at
[appleid.apple.com](https://appleid.apple.com) → Sign-In and Security.

### Step 2. Free developer account — free

Sign in at [developer.apple.com/account](https://developer.apple.com/account)
with that Apple ID and accept the agreement. This costs nothing and takes a
minute.

You can now open the project in Xcode, sign it with your "Personal Team", and
install it on your own iPhone. **Do this now** — it lets you feel the haptics
yourself before spending anything. The app will stop opening after 7 days; just
re-run it from Xcode.

### Step 3. Enrol in the Program — $99/year

At [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll):

- Choose **Individual / Sole Proprietor** (not Organization — that needs a
  D-U-N-S number)
- Your **legal name must match** your payment card and any ID Apple asks for
- Pay $99

Apple may ask to verify your identity. Approval is usually **24–48 hours**,
sometimes same day.

> If you are not a US citizen or permanent resident, Apple may request extra
> identity documents. Allow a little more time.

### Step 4. Create the app record — after approval

At [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** →
**+** → **New App**:

| Field | Value |
|---|---|
| Platform | iOS |
| Name | Gap Sense |
| Primary language | English (U.S.) |
| Bundle ID | `com.gapsense.crossingpractice` |
| SKU | `gapsense-001` (any unique string) |
| User access | Full Access |

The bundle ID is already configured in the project, so it should appear in the
dropdown. If it does not, create it first under **Certificates, Identifiers &
Profiles → Identifiers**.

### Step 5. Upload a build

```sh
cd ios-app
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → set **Team** to your
   new membership
2. Set the device selector at the top to **Any iOS Device (arm64)** — you cannot
   archive while a simulator is selected
3. **Product → Archive**
4. When the Organizer opens: **Distribute App → TestFlight & App Store → Upload**

Processing takes 5–15 minutes. You will get an email when it is ready.

> Export compliance is already answered in the project
> (`ITSAppUsesNonExemptEncryption` is set to `NO`), so Apple will not ask you
> about encryption on every upload.

### Step 6. Beta App Review — once

In App Store Connect → your app → **TestFlight**:

1. Fill in **Test Information**: what to test, and a contact email
2. Add an **external** testing group — call it something like "Conference"
3. Add the build to that group and **Submit for Review**

**Beta App Review usually takes 1–2 days**, and is only needed for the first
build. Later builds go out immediately.

**What to write in "What to Test":**

> Gap Sense helps blind and low-vision travellers build an intuitive sense of how
> long their street crossing takes, using sound and vibration rather than numbers
> of seconds. Please test with VoiceOver on. Enable "Vibrate on cue" under
> Accessibility and confirm the vibration patterns are distinguishable. No
> account or login is needed; the app collects no data.

### Step 7. Get the public link

Once approved: **TestFlight → your group → Public Link → Enable**.

You get a URL anyone can use, with **no need to collect emails in advance**. Up
to **10,000 testers**.

Email that link to participants. They tap it, install TestFlight if they do not
already have it, and tap Install. About 90 seconds.

---

## Timeline

| | Time | Cost |
|---|---|---|
| Apple ID + free developer account | 10 minutes | Free |
| Test on your own iPhone via Xcode | 30 minutes | Free |
| Program enrolment approval | **1–2 days** | $99 |
| App record + upload | 1 hour | — |
| Beta App Review | **1–2 days** | — |
| **Total before you have a shareable link** | **~4–5 days** | **$99** |

**The waiting is the bottleneck, not the work.** If the conference is within two
weeks, start the enrolment as soon as you have approval to spend.

---

## Things that will otherwise catch you out

**TestFlight builds expire after 90 days.** Upload a fresh one close to the
conference.

**Increment the build number every upload.** App Store Connect rejects duplicates.
In Xcode: target → General → Build. Any increasing number works.

**Archive requires a real device target.** With a simulator selected, the Archive
menu item is greyed out.

**Free-account builds last 7 days.** That is the personal-team limit, not a
problem with the app. Re-run from Xcode to refresh.

**The simulator cannot do haptics.** There is no Taptic Engine to drive. Test
vibration on a real iPhone only.

---

## Checklist

**Today, free:**
- [ ] Ask Professor Hong about an existing Stevens Apple Developer account
- [ ] Apple ID with two-factor authentication
- [ ] Free developer account at developer.apple.com
- [ ] Install the app on your own iPhone from Xcode and **feel the haptics yourself**

**Once you have approval to spend:**
- [ ] Enrol as Individual, $99
- [ ] Wait for approval (1–2 days)
- [ ] Create the app record with bundle ID `com.gapsense.crossingpractice`
- [ ] Archive and upload from Xcode
- [ ] Submit for Beta App Review (1–2 days)
- [ ] Enable the public TestFlight link
- [ ] Test that link yourself on a phone that has never had the app

**Before the conference:**
- [ ] Fresh build uploaded (90-day expiry)
- [ ] Both links in the invitation email — the web link to try it, the TestFlight
      link to feel it
