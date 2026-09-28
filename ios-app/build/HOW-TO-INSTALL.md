# Installing Gap Sense on a real iPhone

`GapSense-unsigned.ipa` in this folder is a complete, working build:
arm64, 671 KB, display name "Gap Sense", bundle id
`com.gapsense.crossingpractice`.

## Read this first

**You cannot install an iOS app by copying a file to the iPhone.**

AirDrop, Files, iCloud Drive, email, a USB cable — none of them will install an
app. iOS refuses to run any app that is not *code signed* with a provisioning
profile tied to (a) a specific Apple ID and (b) the specific device's hardware
ID. This is an Apple platform restriction; it is not a limitation of this build.

This `.ipa` is **unsigned**, so it must be signed against your Apple ID before it
can run on your phone. Pick one of the three routes below.

---

## Route 1 — Xcode (recommended: fastest, free, no extra tools)

Xcode signs and installs in one step, so the unsigned `.ipa` is not even needed.

1. Plug the iPhone into the Mac. Tap **Trust This Computer** on the phone.
2. `cd ios-app && npx cap open ios`
3. Project **App** → target **App** → **Signing & Capabilities**
   - Tick **Automatically manage signing**
   - **Team**: your Apple ID (add one via Xcode → Settings → Accounts)
4. Choose your iPhone in the device dropdown at the top.
5. Press **⌘R**.
6. First launch fails with "Untrusted Developer" — on the phone go to
   **Settings → General → VPN & Device Management → [your Apple ID] → Trust**,
   then open the app.

A free Apple ID works. The app stops opening after **7 days** and needs another
⌘R; a paid account ($99/year) extends that to a year.

---

## Route 2 — Sideloadly or AltStore (uses the .ipa in this folder)

For installing without opening Xcode. These tools sign the `.ipa` with your
Apple ID on your computer, then install it.

1. Install [Sideloadly](https://sideloadly.io/) or
   [AltStore](https://altstore.io/) on the Mac.
2. Plug in the iPhone.
3. Drag `GapSense-unsigned.ipa` into the tool.
4. Enter your Apple ID — the tool signs and installs it.
5. Trust the certificate on the phone as in Route 1, step 6.

Same 7-day limit on a free Apple ID.

---

## Route 3 — TestFlight (best for sharing with other people)

Requires a **paid** Apple Developer Program membership ($99/year).

1. In Xcode: **Product → Archive**
2. **Distribute App → TestFlight**
3. Invite testers by email — they install through the TestFlight app.

Builds last 90 days, install over the air with no cable, and you can invite up
to 10,000 testers. This is the right route once O&M instructors start testing.

---

## No Mac cable handy? Test the web version instead

Everything except vibration works in Safari:

```sh
cd ios-app && npm run lan
```

Open the printed `http://192.168.x.x:8000/` address on the phone (same Wi-Fi),
then **Share → Add to Home Screen**. You get a full-screen app with the Gap Sense
icon in about two minutes, no signing involved.

Haptics are the one thing this cannot do — iOS Safari has never supported the web
Vibration API. See `../../docs/HAPTICS.md`.

---

## Rebuilding this .ipa

```sh
cd ios-app
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Release -sdk iphoneos -derivedDataPath /tmp/DEV \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build

mkdir -p /tmp/Payload && cp -R /tmp/DEV/Build/Products/Release-iphoneos/App.app /tmp/Payload/
cd /tmp && zip -qry GapSense-unsigned.ipa Payload
```
