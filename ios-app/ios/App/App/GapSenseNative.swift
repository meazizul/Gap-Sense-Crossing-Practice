import UIKit
import Capacitor
import CoreHaptics
import AudioToolbox
import AppIntents
import AVFoundation

// MARK: - Bridge view controller

/// The storyboard's root view controller. Identical to Capacitor's, plus Gap
/// Sense's own plugin, registered in code because it lives in the app target
/// rather than in a package.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GSNativePlugin())
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        GSSelfTest.runIfRequested(in: webView)
    }
}

// MARK: - Plugin

/// `window.Capacitor.Plugins.GSNative` in the web code.
///
///   haptic({ type })   play one of the app's haptic cues
///   tone({ partials, duration, delay, level, envelope })
///                      play a tone (GapSenseAudio.swift); partials are
///                      [{ freq, gain }], times in seconds from now
///   sustainStart({ partials, level }) -> { id }   a steady tone until stopped
///   sustainStop({ id })
///   stopSound()        silence every tone now
///   audioStatus()      engine, session category, phone volume, route, peak
///   speak({ text, rate, interrupt })  resolves when the speech ends
///   stopSpeaking()
///   pendingScreen()    the activity a Siri / Shortcuts request asked for, if any
///   log({ message })   write to the device log (diagnostics)
///
/// Event "openScreen" { screen } fires when Siri or Shortcuts asks for an
/// activity while the app is already running. Event "volume" { value } fires
/// when the phone's volume changes.
@objc(GSNativePlugin)
public class GSNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GSNativePlugin"
    public let jsName = "GSNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sustainStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sustainStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "audioStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeaking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingScreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise)
    ]

    private let haptics = GSHaptics()
    private var shortcutObserver: NSObjectProtocol?

    private var volumeObservation: NSKeyValueObservation?

    override public func load() {
        // Tell the page when the phone's volume changes, so the "volume is
        // low" note goes away as soon as the student turns it up.
        volumeObservation = AVAudioSession.sharedInstance().observe(\.outputVolume, options: [.new]) { [weak self] _, change in
            guard let value = change.newValue else { return }
            self?.notifyListeners("volume", data: ["value": value])
        }
        shortcutObserver = NotificationCenter.default.addObserver(
            forName: GSShortcutRouter.didRequest, object: nil, queue: .main
        ) { [weak self] note in
            guard let screen = note.userInfo?["screen"] as? String else { return }
            GSShortcutRouter.shared.consume()
            // Kept until the web code is listening, in case Siri asked before
            // the page finished loading.
            self?.notifyListeners("openScreen", data: ["screen": screen], retainUntilConsumed: true)
        }
    }

    deinit {
        if let observer = shortcutObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    @objc func haptic(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "marker"
        DispatchQueue.main.async { [haptics] in
            haptics.play(type)
        }
        call.resolve()
    }

    private func partials(_ call: CAPPluginCall) -> [(Double, Float)] {
        let list = call.getArray("partials", JSObject.self) ?? []
        return list.compactMap { item in
            guard let freq = (item["freq"] as? NSNumber)?.doubleValue,
                  let gain = (item["gain"] as? NSNumber)?.floatValue else { return nil }
            return (freq, gain)
        }
    }

    @objc func tone(_ call: CAPPluginCall) {
        let id = GSAudio.shared.tone(
            partials: partials(call),
            duration: call.getDouble("duration") ?? 0.12,
            delay: call.getDouble("delay") ?? 0,
            level: call.getFloat("level") ?? 1,
            steady: call.getString("envelope") != "pulse"
        )
        call.resolve(["id": id])
    }

    @objc func sustainStart(_ call: CAPPluginCall) {
        let id = GSAudio.shared.startSustained(partials: partials(call), level: call.getFloat("level") ?? 1)
        call.resolve(["id": id])
    }

    @objc func sustainStop(_ call: CAPPluginCall) {
        GSAudio.shared.stop(call.getInt("id") ?? -1)
        call.resolve()
    }

    @objc func stopSound(_ call: CAPPluginCall) {
        GSAudio.shared.stopAll()
        call.resolve()
    }

    @objc func audioStatus(_ call: CAPPluginCall) {
        call.resolve(GSAudio.shared.status())
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let rate = call.getFloat("rate") ?? 1
        let interrupt = call.getBool("interrupt") ?? true
        DispatchQueue.main.async {
            GSSpeech.shared.speak(text, rate: rate, interrupt: interrupt) { call.resolve() }
        }
    }

    @objc func stopSpeaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async { GSSpeech.shared.stop() }
        call.resolve()
    }

    @objc func pendingScreen(_ call: CAPPluginCall) {
        if let screen = GSShortcutRouter.shared.consume() {
            call.resolve(["screen": screen])
        } else {
            call.resolve([:])
        }
    }

    @objc func log(_ call: CAPPluginCall) {
        NSLog("[GapSense] %@", call.getString("message") ?? "")
        call.resolve()
    }
}

// MARK: - Haptics

/// One long-lived Core Haptics engine that plays haptics only.
///
/// Why not the stock @capacitor/haptics plugin: its long buzz created a new
/// CHHapticEngine on every call and let it be freed as soon as the call
/// returned, which can cut the buzz short; and that engine was a full audio
/// engine sharing the app's audio session with the web view's sound. This one
/// is created once, never touches audio (`playsHapticsOnly`), and plays each
/// cue as a single pattern so its taps are evenly spaced.
///
/// The cues are the app's touch vocabulary for DeafBlind students:
///   marker         one strong knock      "this is you"
///   reference_ok   three strong knocks   within the margin / right
///   reference_bad  one long buzz         outside the margin / wrong
///   start          one medium knock      a sample starts or ends
///   ready          two lighter knocks    "get ready"
final class GSHaptics {
    private var engine: CHHapticEngine?
    private let supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics

    private func readyEngine() -> CHHapticEngine? {
        guard supportsCoreHaptics else { return nil }
        if engine == nil {
            do {
                let created = try CHHapticEngine()
                created.playsHapticsOnly = true
                created.isAutoShutdownEnabled = true
                created.resetHandler = { [weak self] in
                    try? self?.engine?.start()
                }
                engine = created
            } catch {
                return nil
            }
        }
        do {
            // Cheap when already running; restarts it after an auto shutdown
            // or an interruption.
            try engine?.start()
        } catch {
            engine = nil
            return nil
        }
        return engine
    }

    private func tap(_ time: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time
        )
    }

    private func hold(_ time: TimeInterval, _ duration: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time,
            duration: duration
        )
    }

    /// A tap is over in a few milliseconds, which testers found too faint,
    /// especially through a pocket. Each pulse is now a sharp tap to mark
    /// the moment plus a short full-strength rumble behind it, so it is felt
    /// as a solid knock. The rhythms are unchanged: one knock, three knocks,
    /// one long buzz, two light knocks.
    private func pulse(_ time: TimeInterval, _ length: TimeInterval, intensity: Float) -> [CHHapticEvent] {
        [tap(time, intensity: intensity, sharpness: 0.7), hold(time, length, intensity: intensity, sharpness: 0.4)]
    }

    private func events(for type: String) -> [CHHapticEvent] {
        switch type {
        case "reference_bad":
            return [tap(0, intensity: 1, sharpness: 0.5), hold(0, 0.6, intensity: 1, sharpness: 0.3)]
        case "reference_ok":
            return pulse(0, 0.08, intensity: 1) + pulse(0.16, 0.08, intensity: 1) + pulse(0.32, 0.08, intensity: 1)
        case "start":
            return pulse(0, 0.06, intensity: 0.85)
        case "ready":
            return pulse(0, 0.05, intensity: 0.7) + pulse(0.14, 0.05, intensity: 0.7)
        default: // marker
            return pulse(0, 0.12, intensity: 1)
        }
    }

    func play(_ type: String) {
        guard let engine = readyEngine() else {
            fallback(type)
            return
        }
        do {
            let pattern = try CHHapticPattern(events: events(for: type), parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            fallback(type)
        }
    }

    /// Devices without Core Haptics (or if it fails): UIKit feedback, and the
    /// system vibration for the long "wrong" buzz.
    private func fallback(_ type: String) {
        switch type {
        case "reference_bad":
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        case "reference_ok":
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.11) { generator.impactOccurred() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) { generator.impactOccurred() }
        case "ready":
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.095) { generator.impactOccurred() }
        case "start":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }
    }
}

// MARK: - Siri and Shortcuts

/// Hands an activity requested by Siri or Shortcuts to the web code. A cold
/// launch keeps it as "pending" until the page asks; a running app gets it
/// through the plugin's "openScreen" event.
final class GSShortcutRouter {
    static let shared = GSShortcutRouter()
    static let didRequest = Notification.Name("GSShortcutRouterDidRequest")

    private let lock = NSLock()
    private var pending: String?

    func request(_ screen: String) {
        lock.lock()
        pending = screen
        lock.unlock()
        NotificationCenter.default.post(name: Self.didRequest, object: nil, userInfo: ["screen": screen])
    }

    @discardableResult
    func consume() -> String? {
        lock.lock()
        defer { lock.unlock() }
        let screen = pending
        pending = nil
        return screen
    }
}

@available(iOS 16.0, *)
struct OpenPracticeIntent: AppIntent {
    static let title: LocalizedStringResource = "Practice my timing"
    static let description = IntentDescription("Opens Practice my timing in Gap Sense.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("practice")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenPreparationIntent: AppIntent {
    static let title: LocalizedStringResource = "Comparison preparation"
    static let description = IntentDescription("Opens Comparison preparation in Gap Sense.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("signal")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenComparisonIntent: AppIntent {
    static let title: LocalizedStringResource = "Comparison practice"
    static let description = IntentDescription("Opens Comparison practice in Gap Sense.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("compare")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenStreetIntent: AppIntent {
    static let title: LocalizedStringResource = "At the street"
    static let description = IntentDescription("Opens At the street in Gap Sense.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        GSShortcutRouter.shared.request("live")
        return .result()
    }
}

/// Phrases Siri recognizes with no setup. Every phrase must contain the app
/// name; Info.plist adds "Gap Sense" as an alternative name.
@available(iOS 16.0, *)
struct GapSenseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenPracticeIntent(),
            phrases: ["Practice my timing in \(.applicationName)", "Open Practice my timing in \(.applicationName)"],
            shortTitle: "Practice my timing",
            systemImageName: "metronome"
        )
        AppShortcut(
            intent: OpenPreparationIntent(),
            phrases: ["Comparison preparation in \(.applicationName)", "Open Comparison preparation in \(.applicationName)"],
            shortTitle: "Comparison preparation",
            systemImageName: "timer"
        )
        AppShortcut(
            intent: OpenComparisonIntent(),
            phrases: ["Comparison practice in \(.applicationName)", "Open Comparison practice in \(.applicationName)"],
            shortTitle: "Comparison practice",
            systemImageName: "arrow.left.arrow.right"
        )
        AppShortcut(
            intent: OpenStreetIntent(),
            phrases: ["At the street in \(.applicationName)", "Open At the street in \(.applicationName)"],
            shortTitle: "At the street",
            systemImageName: "figure.walk"
        )
    }
}

// MARK: - Diagnostics (simulator checks only)

/// Launched with `-GSSelfTest YES`, the app writes a one-line report of its
/// web layer to the device log a few seconds after start: plugins present,
/// sound engine state, speech, the screen showing. With `-GSSelfTestScreen
/// <name>` it first asks for that screen through the Siri path. Never runs in
/// normal use.
enum GSSelfTest {
    private static var ran = false

    static func runIfRequested(in webView: WKWebView?) {
        let defaults = UserDefaults.standard
        guard !ran, defaults.bool(forKey: "GSSelfTest"), let webView = webView else { return }
        ran = true
        if let screen = defaults.string(forKey: "GSSelfTestScreen"), !screen.isEmpty {
            GSShortcutRouter.shared.request(screen)
        }
        // A full scripted check, passed base64-encoded as -GSSelfTestScript.
        // Its result is logged in chunks (the device log truncates long lines).
        if let encoded = defaults.string(forKey: "GSSelfTestScript"),
           let data = Data(base64Encoded: encoded),
           let custom = String(data: data, encoding: .utf8) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                webView.callAsyncJavaScript(custom, arguments: [:], in: nil, in: .page) { result in
                    let text: String
                    switch result {
                    case .success(let value): text = String(describing: value)
                    case .failure(let error): text = "FAILED " + error.localizedDescription
                    }
                    let chunks = stride(from: 0, to: text.count, by: 700).map { start -> String in
                        let from = text.index(text.startIndex, offsetBy: start)
                        let to = text.index(from, offsetBy: min(700, text.count - start))
                        return String(text[from..<to])
                    }
                    for (index, chunk) in chunks.enumerated() {
                        NSLog("[GapSense] result %d/%d %@", index + 1, chunks.count, chunk)
                    }
                    NSLog("[GapSense] result end")
                }
            }
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            let script = """
            const r = {};
            try {
              r.gsnative = Boolean(window.Capacitor?.Plugins?.GSNative);
              r.share = Boolean(window.Capacitor?.Plugins?.Share);
              r.app = Boolean(window.Capacitor?.Plugins?.App);
              r.build = typeof GS_APP_BUILD === "undefined" ? null : GS_APP_BUILD;
              const ctx = ensureAudioContext();
              await new Promise((res) => setTimeout(res, 600));
              r.audio = ctx.state;
              r.audioSession = navigator.audioSession ? navigator.audioSession.type : "none";
              r.speech = typeof speechAvailable === "function" ? speechAvailable() : null;
              r.vibrate = a11ySettings.vibrate;
              r.title = document.getElementById("screenTitle")?.textContent;
              r.haptics = document.getElementById("hapticsSupportNote")?.textContent?.slice(0, 40);
              hapticCue("marker");
              playFeedbackTone("acceptable", 0.05);
              await new Promise((res) => setTimeout(res, 300));
              r.audioAfterTone = ctx.state;
            } catch (e) { r.error = String(e); }
            return JSON.stringify(r);
            """
            webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
                switch result {
                case .success(let value):
                    NSLog("[GapSense] selftest %@", String(describing: value))
                case .failure(let error):
                    NSLog("[GapSense] selftest failed %@", error.localizedDescription)
                }
            }
        }
    }
}
