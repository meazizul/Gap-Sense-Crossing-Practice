/**
 * Tiny static server for testing on a real iPhone over Wi-Fi.
 *
 *   npm run lan
 *
 * Prints every LAN address it is reachable on. Open one of them in Safari on a
 * phone that is on the same Wi-Fi network, then use Share -> Add to Home Screen.
 *
 * Note: service workers (offline caching) only register on a secure origin or
 * on localhost, so over plain LAN HTTP the app runs fine but will not cache for
 * offline use. That is expected for this testing path.
 */
import { createServer } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";

const PORT = Number(process.env.PORT || 8000);
const ROOT = resolve(new URL("./www", import.meta.url).pathname);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = normalize(join(root, decoded));
  // Refuse anything that escapes the served directory.
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}

const server = createServer(async (req, res) => {
  let filePath = safeJoin(ROOT, req.url || "/");
  if (!filePath) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    let stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, "index.html");
      stat = await fs.stat(filePath);
    }
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      // Always revalidate during development so edits show up on the phone.
      "Cache-Control": "no-cache"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);

  console.log("\n  Gap Sense — Crossing Practice — LAN test server\n");
  console.log(`  On this Mac:   http://localhost:${PORT}/`);
  if (addresses.length === 0) {
    console.log("  On your phone: no LAN address found — check your Wi-Fi connection.");
  } else {
    addresses.forEach((address, index) => {
      console.log(`  On your phone: http://${address}:${PORT}/${index === 0 ? "   <- try this one first" : ""}`);
    });
  }
  console.log("\n  The phone must be on the same Wi-Fi network as this Mac.");
  console.log("  In Safari: Share -> Add to Home Screen for the full-screen app.\n");
  console.log("  Press Ctrl+C to stop.\n");
});
