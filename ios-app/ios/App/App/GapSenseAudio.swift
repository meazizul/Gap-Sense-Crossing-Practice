import AVFoundation
import UIKit

// MARK: - Sound

/// CrossingTime's own tone player for the iPhone app.
///
/// Why native: inside the web view, Web Audio is played by WebKit, which
/// decides the audio session itself and can fall back to the "ambient"
/// session that the ring/silent switch mutes. A student at a curb with the
/// switch on would hear nothing and not know why (Cindi: "felt but not
/// heard"). Tones synthesized here play through the app's own `.playback`
/// session, which iOS never mutes with the switch.
///
/// One AVAudioSourceNode renders every voice. Voices are sine partials with
/// the same envelopes as the web code ("pulse": quick attack then a linear
/// fade; "steady": one level from start to end) and are placed by sample
/// frame, so tones scheduled together keep their spacing exactly.
///
/// Loudness: the mix goes through a soft clipper (tanh, drive 3). Measured
/// against build 8: the steady sample about 7 dB louder, the chimes about
/// 5 dB, peaks held just under full scale, and the added overtones carry
/// better on a phone's small speaker. Louder at the same phone volume,
/// without crackling.
///
/// Build 14 (tracker 12.34): steady voices are lowered to 30% while any
/// short cue (the student's own sound, the right or wrong cue) plays, with a
/// few milliseconds of smoothing, so the cue stays clean over the sample
/// instead of merging with it, and the two together no longer drive the
/// clipper. The web version does the same with gain automation.
final class GSAudio {
    static let shared = GSAudio()

    private struct Voice {
        var id: Int = 0
        var active = false
        var freqs: (Double, Double, Double, Double) = (0, 0, 0, 0)
        var gains: (Float, Float, Float, Float) = (0, 0, 0, 0)
        var phases: (Double, Double, Double, Double) = (0, 0, 0, 0)
        var count = 0
        var level: Float = 1
        var startFrame: Int64 = 0
        var endFrame: Int64 = .max      // when the release begins
        var attackFrames: Int64 = 1
        var releaseFrames: Int64 = 1
        var steady = true
    }

    private static let maxVoices = 32
    private static let drive: Float = 3
    private static let duckLevel: Float = 0.3
    private var duckSmooth: Float = 0        // 0 = no cue playing, 1 = fully ducked
    private var pulseScratch = [Float](repeating: 0, count: 4096)
    private var steadyScratch = [Float](repeating: 0, count: 4096)
    private var envScratch = [Float](repeating: 0, count: 4096)

    private let engine = AVAudioEngine()
    private var source: AVAudioSourceNode?
    private var sampleRate: Double = 48_000
    private let lock: UnsafeMutablePointer<os_unfair_lock> = {
        let pointer = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
        pointer.initialize(to: os_unfair_lock())
        return pointer
    }()
    private var voices = [Voice](repeating: Voice(), count: GSAudio.maxVoices)
    private var frame: Int64 = 0          // frames rendered so far
    private var nextId = 1
    private var peak: Float = 0           // loudest output sample since last status()
    private var tonesStarted = 0
    private var observers: [NSObjectProtocol] = []

    private init() {
        configureSession()
        buildGraph()
        start()
        observe()
    }

    // MARK: Session

    /// `.playback` is the category iOS documents as playing with the
    /// ring/silent switch on. `.mixWithOthers` leaves the student's own audio
    /// and VoiceOver alone. Called again whenever something may have changed
    /// it: coming back to the app, the end of an interruption, a media reset.
    func configureSession(force: Bool = true) {
        let session = AVAudioSession.sharedInstance()
        let changed = session.category != .playback || !session.categoryOptions.contains(.mixWithOthers)
        guard changed || force else { return }
        do {
            if changed {
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            }
            try session.setActive(true)
        } catch {
            NSLog("[GapSense] audio session: %@", error.localizedDescription)
        }
    }

    // MARK: Engine

    private func buildGraph() {
        let output = engine.outputNode.inputFormat(forBus: 0)
        sampleRate = output.sampleRate > 0 ? output.sampleRate : 48_000
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1) else { return }
        let node = AVAudioSourceNode(format: format) { [unowned self] _, _, frameCount, bufferList -> OSStatus in
            self.render(frameCount: Int(frameCount), bufferList: bufferList)
            return noErr
        }
        source = node
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 1
        engine.prepare()
    }

    @discardableResult
    private func start() -> Bool {
        if engine.isRunning { return true }
        configureSession()
        do {
            try engine.start()
            return true
        } catch {
            NSLog("[GapSense] audio engine: %@", error.localizedDescription)
            return false
        }
    }

    private func observe() {
        let center = NotificationCenter.default
        // A call, Siri or an alarm stops the engine; start again when it ends.
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
            self?.start()
        })
        // Headphones plugged in or out, AirPods connecting: the engine stops
        // itself after a change of output and has to be started again.
        observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            self?.start()
        })
        observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            self?.configureSession()
            self?.start()
        })
        observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.configureSession()
            self?.start()
        })
    }

    // MARK: Playing

    /// Schedule one tone `delay` seconds from now. Returns its id.
    @discardableResult
    func tone(partials: [(Double, Float)], duration: Double, delay: Double, level: Float, steady: Bool) -> Int {
        add(partials: partials, duration: max(0.005, duration), delay: max(0, delay), level: level, steady: steady)
    }

    /// Start a steady tone that lasts until `stop(id)`.
    func startSustained(partials: [(Double, Float)], level: Float) -> Int {
        add(partials: partials, duration: nil, delay: 0, level: level, steady: true)
    }

    /// Fade a sustained tone out now (12 ms, no click).
    func stop(_ id: Int) {
        os_unfair_lock_lock(lock)
        for index in voices.indices where voices[index].active && voices[index].id == id {
            voices[index].endFrame = max(voices[index].startFrame, frame)
        }
        os_unfair_lock_unlock(lock)
    }

    /// Silence everything at once (leaving a screen, cancelling a replay).
    func stopAll() {
        os_unfair_lock_lock(lock)
        for index in voices.indices where voices[index].active {
            voices[index].endFrame = min(voices[index].endFrame, max(voices[index].startFrame, frame))
            if voices[index].startFrame > frame { voices[index].active = false }
        }
        os_unfair_lock_unlock(lock)
    }

    private func add(partials: [(Double, Float)], duration: Double?, delay: Double, level: Float, steady: Bool) -> Int {
        // Cheap check before every tone: if anything has moved the session
        // off .playback, put it back before the tone can be muted.
        configureSession(force: false)
        start()
        var voice = Voice()
        let used = Array(partials.prefix(4))
        voice.count = used.count
        func f(_ i: Int) -> Double { i < used.count ? used[i].0 : 0 }
        func g(_ i: Int) -> Float { i < used.count ? used[i].1 : 0 }
        voice.freqs = (f(0), f(1), f(2), f(3))
        voice.gains = (g(0), g(1), g(2), g(3))
        voice.level = max(0, min(1.5, level))
        voice.steady = steady
        voice.attackFrames = Int64((steady ? 0.006 : 0.01) * sampleRate)
        voice.releaseFrames = Int64((steady ? 0.012 : 0.07) * sampleRate)
        voice.active = true

        os_unfair_lock_lock(lock)
        // A few milliseconds ahead of the render position, so the first
        // frames are never already past.
        voice.startFrame = frame + Int64((delay + 0.005) * sampleRate)
        if let duration = duration {
            voice.endFrame = voice.startFrame + Int64(duration * sampleRate)
        }
        voice.id = nextId
        nextId += 1
        tonesStarted += 1
        let slot = voices.firstIndex(where: { !$0.active })
            ?? voices.indices.min(by: { voices[$0].startFrame < voices[$1].startFrame })!
        voices[slot] = voice
        os_unfair_lock_unlock(lock)
        return voice.id
    }

    // MARK: Rendering (audio thread)

    private func render(frameCount: Int, bufferList: UnsafeMutablePointer<AudioBufferList>) {
        let buffers = UnsafeMutableAudioBufferListPointer(bufferList)
        guard let out = buffers.first?.mData?.assumingMemoryBound(to: Float.self) else { return }
        for i in 0..<frameCount { out[i] = 0 }

        os_unfair_lock_lock(lock)
        if pulseScratch.count < frameCount {
            pulseScratch = [Float](repeating: 0, count: frameCount)
            steadyScratch = [Float](repeating: 0, count: frameCount)
            envScratch = [Float](repeating: 0, count: frameCount)
        }
        for i in 0..<frameCount { pulseScratch[i] = 0; steadyScratch[i] = 0; envScratch[i] = 0 }
        let first = frame
        let twoPi = 2.0 * Double.pi
        for v in voices.indices where voices[v].active {
            var voice = voices[v]
            let releaseEnd = voice.endFrame == .max ? Int64.max : voice.endFrame + voice.releaseFrames
            if first + Int64(frameCount) <= voice.startFrame { continue }
            let steps = (twoPi * voice.freqs.0 / sampleRate, twoPi * voice.freqs.1 / sampleRate,
                         twoPi * voice.freqs.2 / sampleRate, twoPi * voice.freqs.3 / sampleRate)
            for i in 0..<frameCount {
                let n = first + Int64(i)
                if n < voice.startFrame { continue }
                if n >= releaseEnd { voice.active = false; break }
                let t = n - voice.startFrame
                var env: Float
                if t < voice.attackFrames {
                    env = Float(t) / Float(max(1, voice.attackFrames))
                } else if voice.steady {
                    env = 1
                } else {
                    // pulse: from full at the end of the attack down to zero
                    // at the end of the release, as the web version does.
                    let span = max(1, releaseEnd - voice.startFrame - voice.attackFrames)
                    env = 1 - Float(t - voice.attackFrames) / Float(span)
                }
                if voice.steady && n >= voice.endFrame {
                    env *= 1 - Float(n - voice.endFrame) / Float(max(1, voice.releaseFrames))
                }
                var s: Float = 0
                if voice.count > 0 { s += voice.gains.0 * Float(sin(voice.phases.0)); voice.phases.0 += steps.0 }
                if voice.count > 1 { s += voice.gains.1 * Float(sin(voice.phases.1)); voice.phases.1 += steps.1 }
                if voice.count > 2 { s += voice.gains.2 * Float(sin(voice.phases.2)); voice.phases.2 += steps.2 }
                if voice.count > 3 { s += voice.gains.3 * Float(sin(voice.phases.3)); voice.phases.3 += steps.3 }
                // Steady voices (the sample) and short cues are summed apart,
                // so the cues can lower the sample underneath them.
                if voice.steady {
                    steadyScratch[i] += s * env * voice.level
                } else {
                    pulseScratch[i] += s * env * voice.level
                    envScratch[i] = max(envScratch[i], min(1, env * voice.level * 2))
                }
            }
            // Keep phases small so long tones stay accurate.
            voice.phases = (voice.phases.0.truncatingRemainder(dividingBy: twoPi), voice.phases.1.truncatingRemainder(dividingBy: twoPi),
                            voice.phases.2.truncatingRemainder(dividingBy: twoPi), voice.phases.3.truncatingRemainder(dividingBy: twoPi))
            voices[v] = voice
        }
        frame = first + Int64(frameCount)

        // Duck: follow the cue envelope with ~3 ms attack and ~25 ms release.
        let attack: Float = 1 - expf(-1 / (0.003 * Float(sampleRate)))
        let release: Float = 1 - expf(-1 / (0.025 * Float(sampleRate)))
        var duck = duckSmooth
        for i in 0..<frameCount {
            let target = envScratch[i] > 0.02 ? Float(1) : Float(0)
            duck += (target - duck) * (target > duck ? attack : release)
            out[i] = steadyScratch[i] * (1 - duck * (1 - GSAudio.duckLevel)) + pulseScratch[i]
        }
        duckSmooth = duck

        let norm = tanhf(GSAudio.drive)
        var loudest = peak
        for i in 0..<frameCount {
            let y = tanhf(GSAudio.drive * out[i]) / norm
            out[i] = y
            loudest = max(loudest, abs(y))
        }
        peak = loudest
        os_unfair_lock_unlock(lock)
        for b in buffers.dropFirst() {
            if let data = b.mData { memcpy(data, out, Int(b.mDataByteSize)) }
        }
    }

    // MARK: Status

    /// What the app can see of its sound: used by "Play a test sound" and by
    /// the simulator checks. `peak` is the loudest sample played since the
    /// last call (0 to 1).
    func status() -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        os_unfair_lock_lock(lock)
        let loudest = peak
        peak = 0
        let started = tonesStarted
        os_unfair_lock_unlock(lock)
        return [
            "engineRunning": engine.isRunning,
            "category": session.category.rawValue,
            "ignoresSilentSwitch": session.category == .playback,
            "outputVolume": session.outputVolume,
            "outputLatency": session.outputLatency,
            "route": session.currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ","),
            "peak": loudest,
            "tonesStarted": started
        ]
    }
}

// MARK: - Speech

/// Spoken prompts ("Get ready", self-voicing) through the app's own audio
/// session, so the silent switch cannot mute them either.
/// Used from the main thread only.
final class GSSpeech: NSObject, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    static let shared = GSSpeech()

    private let synthesizer = AVSpeechSynthesizer()
    private var finished: [ObjectIdentifier: () -> Void] = [:]

    override private init() {
        super.init()
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = true
    }

    /// rate: the web code's 0.5–2 scale, where 1 is normal speed.
    func speak(_ text: String, rate: Float, interrupt: Bool, onDone: @escaping () -> Void) {
        GSAudio.shared.configureSession()
        if interrupt { stop() }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        let normal = AVSpeechUtteranceDefaultSpeechRate
        let scaled = rate >= 1
            ? normal + (AVSpeechUtteranceMaximumSpeechRate - normal) * min(1, (rate - 1) / 1.0) * 0.6
            : normal - (normal - AVSpeechUtteranceMinimumSpeechRate) * min(1, (1 - rate) / 0.5) * 0.6
        utterance.rate = scaled
        utterance.volume = 1
        finished[ObjectIdentifier(utterance)] = onDone
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        finished.removeValue(forKey: ObjectIdentifier(utterance))?()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        finished.removeValue(forKey: ObjectIdentifier(utterance))?()
    }
}
