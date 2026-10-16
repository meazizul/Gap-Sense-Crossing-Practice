import UIKit
import Capacitor
import CoreHaptics
import AudioToolbox
import AppIntents

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
///   pendingScreen()    the activity a Siri / Shortcuts request asked for, if any
///   log({ message })   write to the device log (diagnostics)
///
/// Event "openScreen" { screen } fires when Siri or Shortcuts asks for an
/// activity while the app is already running.
@objc(GSNativePlugin)
public class GSNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GSNativePlugin"
    public let jsName = "GSNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingScreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise)
    ]

    private let haptics = GSHaptics()
    private var shortcutObserver: NSObjectProtocol?

    override public func load() {
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
///   marker         one strong tap        "this is you"
///   reference_ok   three strong taps     within the margin / right
///   reference_bad  one long buzz         outside the margin / wrong
///   start          one medium tap        a sample starts or ends
///   ready          two light taps        "get ready"
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

    private func buzz(_ duration: TimeInterval) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.35)
            ],
            relativeTime: 0,
            duration: duration
        )
    }

    private func events(for type: String) -> [CHHapticEvent] {
        switch type {
        case "reference_bad":
            return [buzz(0.45)]
        case "reference_ok":
            return [tap(0, intensity: 1, sharpness: 0.8), tap(0.11, intensity: 1, sharpness: 0.8), tap(0.22, intensity: 1, sharpness: 0.8)]
        case "start":
            return [tap(0, intensity: 0.75, sharpness: 0.45)]
        case "ready":
            return [tap(0, intensity: 0.55, sharpness: 0.6), tap(0.095, intensity: 0.55, sharpness: 0.6)]
        default: // marker
            return [tap(0, intensity: 1, sharpness: 0.7)]
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
