// Browser tests for the web app, run in the Google Chrome already installed on
// the machine (no browser download). `npm test` from ios-app/.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // The installed Google Chrome, not a downloaded Chromium build.
    headless: true,
    baseURL: "http://127.0.0.1:8765/",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    // Web Audio needs a real (fake) output device; these flags give Chrome one
    // and skip the user-gesture requirement so tones are scheduled.
    launchOptions: {
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream"
      ]
    }
  },
  webServer: {
    command: "python3 -m http.server 8765 --directory www --bind 127.0.0.1",
    url: "http://127.0.0.1:8765/index.html",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore",
    timeout: 15_000
  }
});
