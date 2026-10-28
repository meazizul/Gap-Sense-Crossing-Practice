# How the iPhone and Android apps are built

Gap Sense is a web app. The iPhone and Android apps are the same web app,
wrapped in a native shell with [Capacitor](https://capacitorjs.com/) 7.

The native shell exists for one main reason: Safari on iPhone cannot vibrate,
and vibration is the whole interface for DeafBlind students. The shell also
adds Siri, home-screen shortcuts, the share menu, and `gapsense://` links.

---

## Folder layout

```
ios-app/
├── www/                      The app itself. Edit here.
│   ├── index.html              All screens and dialogs
│   ├── css/app.css             Styles, themes, large-text reflow
│   ├── js/engine.js            Timing, sound, haptics, replay, settings, setup links
│   ├── js/history.js           Attempt log, adaptive margin, report
│   ├── js/features.js          Instructor setup: what the student sees
│   ├── js/comparison.js        Comparison practice and At the street
│   ├── js/signal.js            Comparison preparation
│   ├── js/app.js               Screens, Home, Progress, Help, first run
│   ├── manifest.webmanifest, sw.js, icons/   Web app install and offline use
├── ios/                      Native iOS project
├── android/                  Native Android project
├── tests/                    Playwright browser tests
├── capacitor.config.json     Capacitor settings (app name, splash, status bar)
└── serve-lan.mjs             Local server that a phone on the same Wi-Fi can reach
```

There is no build step and no framework. The files in `www/` run as they are.

---

## Run it locally

```sh
cd ios-app
npm install          # once
npm run dev          # http://localhost:8000
npm run lan          # also prints an address a phone on the same Wi-Fi can open
npm test             # the Playwright browser tests (uses an installed Google Chrome)
```

Open **Instructor setup**, enter two crossing times (for example 4 and 8
seconds), then open **Practice my timing** and press **Begin**. Or open
`/?demo=1` to load example times.

After changing anything in `www/`, copy it into the native projects:

```sh
npx cap sync         # copies www/ and updates native plugins for iOS and Android
```

---

## What the native shell adds

### Capacitor plugins

| Plugin | Used for |
|---|---|
| App | Reading the version and build (Help → About), and receiving `gapsense://` links |
| Haptics | Vibration on Android |
| Share | The phone's share menu, for the setup link and the progress report |
| SplashScreen | The launch screen |
| StatusBar | Status bar style matching the theme |

### Gap Sense's own Android plugin (`android/app/src/main/java/.../GSAndroidPlugin.java`)

- **Window background.** Android 15 and 16 draw the app edge to edge, and
  Capacitor keeps the page clear of the status and navigation bars by adding
  margins (`adjustMarginsForEdgeToEdge: "auto"` in `capacitor.config.json`).
  The window background shows in those margins, so the page passes its own
  background colour to `setWindowBackground` whenever the theme is applied,
  and the status bar icons stay readable on light and dark themes. The window
  starts in the system's light or dark colour (`styles.xml`).
- The Android app targets Android 16 (API 36), which Google Play requires
  (`variables.gradle`); the Android Gradle plugin is 8.9.1.
- **Screen reader check.** `accessibilityStatus` answers whether TalkBack
  (touch exploration) is on, so the page hands the replay word and the sound
  descriptions to TalkBack instead of speaking them itself (build 15).
- **Speech.** Android's web view has no web speech engine, so `speak`,
  `stopSpeaking` and `speechStatus` put the app's own voice through Android
  text-to-speech (build 15): "Get ready", "Replay", the descriptions and
  Speak directions aloud. `speak` resolves when the utterance ends.

### Gap Sense's own iOS plugin (`ios/App/App/GapSenseNative.swift`)

- **Haptics.** One Core Haptics engine is created once and kept. It plays
  haptics only, so it never touches the app's sound. Each cue is one pattern:
  one strong tap ("this is you"), three strong taps (within the margin), one
  long buzz (outside the margin), one medium tap (a sample starts or ends), and
  two light taps ("get ready"). Phones without Core Haptics fall back to UIKit
  feedback.
- **Siri.** App Shortcuts let a student say "Practice my timing in Gap Sense"
  (and the same for the other three activities) with no setup. They also appear
  in the Shortcuts app.
- **Self-test.** Launched with `-GSSelfTest YES`, the app writes a one-line
  health report to the device log: plugins present, sound engine state, speech
  available, and which screen is showing. It never runs in normal use.
- **Screen reader check.** `accessibilityStatus` answers whether VoiceOver
  (and Switch Control) is running, asked at start and whenever the app comes
  back to the front, so the replay word and the sound descriptions go to
  VoiceOver's voice when there is one (build 15).

It also plays the app's sounds and speech (see Sound below). The web code reaches it as `window.Capacitor.Plugins.GSNative`. In a browser,
the web code falls back to the Vibration API (Android browsers) or nothing
(Safari).

### iOS details

- **Scene lifecycle.** The app uses the UIScene lifecycle (`SceneDelegate` in
  `AppDelegate.swift`, scene manifest in `Info.plist`). iOS 27 closes apps that
  do not.
- **Audio route changes (build 13).** The plugin also sends its `volume`
  event when `AVAudioSession.routeChangeNotification` fires (headphones
  connected or removed), so the page re-reads `audioStatus` and the output
  delay it subtracts matches the route in use. Pinch zoom is on
  (`zoomEnabled: true`); the Direct Touch rectangle is mapped through the
  visual viewport.
- **Direct touch (build 12).** `GSNative.directTouchShow` lays a native
  `GSDirectTouchView` (accessibility trait `allowsDirectInteraction`) over the
  pad's gesture surface at the rectangle the page sends; its gestures come back
  as the `directTouch` event with how long the finger was down. VoiceOver users
  turn on Direct Touch for the app once.
- **Sound (build 9).** Every tone and spoken prompt is played by the app
  itself (`GapSenseAudio.swift`), not by the web view. Inside a web view,
  WebKit decides the audio session for Web Audio and can fall back to the one
  the ring/silent switch mutes. The native player uses the app's `playback`
  session, which iOS never mutes with the switch, and puts it back if anything
  changes it. It starts itself again after a call, Siri, or a change of
  headphones. The web code sends each tone as frequencies, length, delay and
  level (`GSNative.tone`); no web audio is created in the iPhone app.
- **Loudness.** All cues pass through a soft clipper (tanh, drive 3): about
  7 dB louder for the steady sample and 5 dB for the chimes than build 8,
  with peaks just under full scale. The browser and Android builds use the same
  curve in Web Audio.
- **Phone volume.** The app cannot change the phone's volume. When it is
  below half, Home says so and asks the student to press volume up.
- **Minimum iOS 16.0**, arm64.

### Links and shortcuts (iOS and Android)

- `gapsense://setup?ts=…` applies an instructor's setup. A browser that opens a
  setup link offers "Open in the Gap Sense app" with this address.
- `gapsense://open/practice` (or `signal`, `compare`, `live`) opens an
  activity.
- Android adds four launcher shortcuts (touch and hold the app icon), defined
  in `android/app/src/main/res/xml/shortcuts.xml`.

### Permissions

- iOS: none beyond the defaults. The app does not use the microphone.
- Android: `INTERNET` and `VIBRATE` only.

---

## Building the native apps

- **iOS:** open `ios/App/App.xcworkspace` in Xcode (`npm run ios`), choose a
  simulator or a connected iPhone, and run. Installing on a real iPhone needs
  your own Apple signing setup in Xcode.
- **Android:** open `android/` in Android Studio, or run
  `./gradlew assembleDebug` inside `android/`. The APK is written to
  `android/app/build/outputs/apk/debug/`.

Simulators and emulators show the screens and play sound, but cannot vibrate.
Haptics, real loudness, VoiceOver and TalkBack need a real phone.

---

## Testing

`npm test` runs 74 browser tests in Google Chrome. They cover every activity,
the instructor setup, setup links, the report, the accessibility modes, and the
native bridge (with a stand-in for the native plugins). See
[`../docs/TESTING.md`](../docs/TESTING.md) for the manual checklists.
