#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

function parseArgs(argv) {
  const parsed = {
    manifestPath: "",
    mode: "check",
    docName: "",
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--manifest") {
      parsed.manifestPath = args[++i] ?? "";
    } else if (arg.startsWith("--manifest=")) {
      parsed.manifestPath = arg.slice("--manifest=".length);
    } else if (arg === "--write") {
      parsed.mode = "write";
    } else if (arg === "--check") {
      parsed.mode = "check";
    } else if (arg === "--doc") {
      parsed.docName = args[++i] ?? "";
    } else if (arg.startsWith("--doc=")) {
      parsed.docName = arg.slice("--doc=".length);
    }
  }

  if (!parsed.manifestPath) {
    throw new Error("Pass --manifest <path>.");
  }

  return parsed;
}

function resolvePath(baseDir, candidate) {
  if (!candidate) return "";
  return path.isAbsolute(candidate) ? candidate : path.resolve(baseDir, candidate);
}

function resolveAgentToolingRoot({ manifest, repoRoot }) {
  const overrideRoot = process.env[manifest.resolver?.envVar ?? "AGENT_TOOLING_ROOT"];
  if (overrideRoot) {
    return path.resolve(repoRoot, overrideRoot);
  }

  const packageName = manifest.resolver?.packageName;
  if (packageName) {
    const requireFromRepo = createRequire(path.join(repoRoot, "package.json"));
    const packageJsonPath = requireFromRepo.resolve(`${packageName}/package.json`);
    return path.dirname(packageJsonPath);
  }

  throw new Error(
    "Unable to resolve agent-tooling. Install the configured package or set AGENT_TOOLING_ROOT.",
  );
}

function renderTemplate(template, variables) {
  const withoutTemplateGuidance = template.replace(
    /^<!-- TEMPLATE_GUIDANCE:BEGIN[\s\S]*?TEMPLATE_GUIDANCE:END -->\r?\n?/,
    "",
  );

  return withoutTemplateGuidance.replaceAll(/{{([A-Z0-9_]+)}}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`Missing template variable: ${key}`);
    }
    return String(variables[key]);
  });
}

async function loadJson(absPath) {
  const raw = await readFile(absPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestAbsPath = path.resolve(process.cwd(), args.manifestPath);
  const manifestDir = path.dirname(manifestAbsPath);
  const manifest = await loadJson(manifestAbsPath);
  const repoRoot = resolvePath(manifestDir, manifest.repoRoot || ".");
  const agentToolingRoot = resolveAgentToolingRoot({ manifest, repoRoot });

  const refreshCommand = manifest.refreshCommand ?? "npm run docs:shared:refresh";
  const checkCommand = manifest.checkCommand ?? "npm run docs:shared:check";

  const candidates = (manifest.sharedWrappers ?? []).filter((entry) => entry.sourceDoc);
  const docs = args.docName
    ? candidates.filter((entry) => entry.name === args.docName)
    : candidates;

  if (docs.length === 0) {
    throw new Error("No managed shared-wrapper docs matched the request.");
  }

  const problems = [];

  for (const doc of docs) {
    const outputAbsPath = resolvePath(manifestDir, doc.path);
    const sourceAbsPath = path.join(agentToolingRoot, "shared-docs", `${doc.sourceDoc}.md`);
    const template = await readFile(sourceAbsPath, "utf8");

    const variables = {
      REPO_NAME: manifest.repoName ?? "",
      REPO_ROOT: repoRoot.replaceAll("\\", "/"),
      MANIFEST_PATH: path.relative(repoRoot, manifestAbsPath).replaceAll("\\", "/"),
      SOURCE_REPO: doc.sourceRepo ?? manifest.sharedSource?.repo ?? "agent-tooling",
      SOURCE_DOC: doc.sourceDoc,
      REFRESH_COMMAND: refreshCommand,
      CHECK_COMMAND: checkCommand,
      DOC_NAME: doc.name,
      ...(manifest.variables ?? {}),
      ...(doc.variables ?? {}),
    };

    const rendered = renderTemplate(template, variables).replace(/\r?\n/g, "\n");

    let current = "";
    try {
      current = (await readFile(outputAbsPath, "utf8")).replace(/\r?\n/g, "\n");
    } catch {
      current = "";
    }

    if (args.mode === "write") {
      if (current !== rendered) {
        await mkdir(path.dirname(outputAbsPath), { recursive: true });
        await writeFile(outputAbsPath, rendered);
        console.log(`updated ${path.relative(repoRoot, outputAbsPath)}`);
      } else {
        console.log(`ok ${path.relative(repoRoot, outputAbsPath)}`);
      }
      continue;
    }

    if (current !== rendered) {
      problems.push({
        name: doc.name,
        path: outputAbsPath,
      });
    }
  }

  if (problems.length > 0) {
    console.error("Shared docs are out of date:");
    for (const problem of problems) {
      console.error(`- ${path.relative(repoRoot, problem.path)}`);
    }
    console.error(`Run: ${refreshCommand}`);
    process.exit(1);
  }

  console.log("Shared docs are up to date.");
}

await main();
