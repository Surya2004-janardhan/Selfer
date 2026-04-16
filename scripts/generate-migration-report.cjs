const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src-reference");
const outPath = path.join(repoRoot, "MIGRATION_REPORT.md");
const priorityOutPath = path.join(repoRoot, "MIGRATION_PRIORITY_REPORT.md");

function walk(dir, fileCb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p, fileCb);
    } else {
      fileCb(p);
    }
  }
}

function rel(p) {
  return path.relative(repoRoot, p).split(path.sep).join("/");
}

function existsAsModule(absPath) {
  if (fs.existsSync(absPath)) return true;
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md"];
  for (const ext of exts) {
    if (fs.existsSync(absPath + ext)) return true;
  }
  if (absPath.endsWith(".js")) {
    const base = absPath.slice(0, -3);
    for (const ext of [".ts", ".tsx"]) {
      if (fs.existsSync(base + ext)) return true;
    }
  }
  return false;
}

function scanMissingLocalImports() {
  const missing = new Set();
  walk(srcRoot, (filePath) => {
    if (!/\.(ts|tsx|js|mjs)$/.test(filePath)) return;
    const source = fs.readFileSync(filePath, "utf8");
    const re =
      /(?:import|export)\s+(?:[^'"`]*?from\s*)?['"]([^'"\n]+)['"]|require\(['"]([^'"\n]+)['"]\)/g;
    let m;
    while ((m = re.exec(source))) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(filePath), spec);
      if (!existsAsModule(abs)) missing.add(rel(abs));
    }
  });
  return [...missing].sort();
}

function collectAutoStubs() {
  const stubs = [];
  walk(srcRoot, (filePath) => {
    if (!/\.(ts|tsx|js|jsx|mjs|md|d\.ts)$/.test(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    if (
      content.includes("Auto-generated compatibility stub") ||
      content.includes("__stubModule")
    ) {
      stubs.push(rel(filePath));
    }
  });
  return stubs.sort();
}

function collectMdWrappers() {
  const wrappers = [];
  walk(srcRoot, (filePath) => {
    if (filePath.endsWith(".md.js")) wrappers.push(rel(filePath));
  });
  return wrappers.sort();
}

function collectStubPackages() {
  const stubsRoot = path.join(repoRoot, "stubs");
  if (!fs.existsSync(stubsRoot)) return [];
  const out = [];
  walk(stubsRoot, (filePath) => {
    if (path.basename(filePath) === "package.json") {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (parsed.name) out.push(parsed.name);
      } catch {
        // ignore malformed package stubs
      }
    }
  });
  return [...new Set(out)].sort();
}

function classifyStubPriority(stubPath) {
  const p = stubPath;

  const p0Prefixes = [
    "src-reference/bootstrap/",
    "src-reference/query",
    "src-reference/QueryEngine",
    "src-reference/main",
    "src-reference/tools/",
    "src-reference/services/api/",
    "src-reference/services/mcp/",
    "src-reference/entrypoints/",
    "src-reference/types/",
  ];

  const p1Prefixes = [
    "src-reference/commands/",
    "src-reference/components/",
    "src-reference/state/",
    "src-reference/bridge/",
    "src-reference/hooks/",
    "src-reference/services/compact/",
    "src-reference/services/skillSearch/",
    "src-reference/services/oauth/",
    "src-reference/utils/",
  ];

  if (p0Prefixes.some((prefix) => p.startsWith(prefix))) {
    return "P0";
  }

  if (p1Prefixes.some((prefix) => p.startsWith(prefix))) {
    return "P1";
  }

  return "P2";
}

function classifyStubPackagePriority(pkg) {
  const p0Pkgs = new Set([
    "@anthropic-ai/claude-agent-sdk",
    "@anthropic-ai/mcpb",
    "@anthropic-ai/sandbox-runtime",
  ]);
  const p1Pkgs = new Set([
    "@ant/claude-for-chrome-mcp",
    "@ant/computer-use-input",
    "@ant/computer-use-mcp",
    "@ant/computer-use-swift",
    "color-diff-napi",
    "modifiers-napi",
    "audio-capture.node",
  ]);

  if (p0Pkgs.has(pkg)) return "P0";
  if (p1Pkgs.has(pkg)) return "P1";
  return "P2";
}

const autoStubs = collectAutoStubs();
const mdWrappers = collectMdWrappers();
const stubPackages = collectStubPackages();
const unresolvedLocal = scanMissingLocalImports();

const report = [
  "# Migration Report",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Auto-generated compatibility stubs: ${autoStubs.length}`,
  `- Markdown import wrappers (.md.js): ${mdWrappers.length}`,
  `- Local stub packages: ${stubPackages.length}`,
  `- Unresolved local imports: ${unresolvedLocal.length}`,
  "",
  "## Stub Packages",
  "",
  ...(stubPackages.length ? stubPackages.map((p) => `- ${p}`) : ["- none"]),
  "",
  "## Auto-Generated Compatibility Files",
  "",
  ...(autoStubs.length ? autoStubs.map((p) => `- ${p}`) : ["- none"]),
  "",
  "## Markdown Wrapper Files",
  "",
  ...(mdWrappers.length ? mdWrappers.map((p) => `- ${p}`) : ["- none"]),
  "",
  "## Unresolved Local Imports",
  "",
  ...(unresolvedLocal.length
    ? unresolvedLocal.map((p) => `- ${p}`)
    : ["- none"]),
  "",
].join("\n");

const stubsByPriority = {
  P0: [],
  P1: [],
  P2: [],
};
for (const stub of autoStubs) {
  stubsByPriority[classifyStubPriority(stub)].push(stub);
}

const packagesByPriority = {
  P0: [],
  P1: [],
  P2: [],
};
for (const pkg of stubPackages) {
  packagesByPriority[classifyStubPackagePriority(pkg)].push(pkg);
}

const priorityReport = [
  "# Migration Priority Report",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "## Triage Strategy",
  "",
  "- P0: Runtime-core and protocol-critical replacements (must replace first)",
  "- P1: High-usage command/UI/service replacements (second wave)",
  "- P2: Low-frequency or peripheral replacements (final wave)",
  "",
  "## Summary",
  "",
  `- P0 compatibility files: ${stubsByPriority.P0.length}`,
  `- P1 compatibility files: ${stubsByPriority.P1.length}`,
  `- P2 compatibility files: ${stubsByPriority.P2.length}`,
  `- P0 stub packages: ${packagesByPriority.P0.length}`,
  `- P1 stub packages: ${packagesByPriority.P1.length}`,
  `- P2 stub packages: ${packagesByPriority.P2.length}`,
  "",
  "## P0 Stub Packages (Replace First)",
  "",
  ...(packagesByPriority.P0.length
    ? packagesByPriority.P0.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## P1 Stub Packages",
  "",
  ...(packagesByPriority.P1.length
    ? packagesByPriority.P1.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## P2 Stub Packages",
  "",
  ...(packagesByPriority.P2.length
    ? packagesByPriority.P2.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## P0 Compatibility Files (Replace First)",
  "",
  ...(stubsByPriority.P0.length
    ? stubsByPriority.P0.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## P1 Compatibility Files",
  "",
  ...(stubsByPriority.P1.length
    ? stubsByPriority.P1.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## P2 Compatibility Files",
  "",
  ...(stubsByPriority.P2.length
    ? stubsByPriority.P2.map((p) => `- ${p}`)
    : ["- none"]),
  "",
  "## Markdown Wrapper Backlog",
  "",
  ...(mdWrappers.length ? mdWrappers.map((p) => `- ${p}`) : ["- none"]),
  "",
  "## Unresolved Local Imports",
  "",
  ...(unresolvedLocal.length
    ? unresolvedLocal.map((p) => `- ${p}`)
    : ["- none"]),
  "",
].join("\n");

fs.writeFileSync(outPath, report, "utf8");
fs.writeFileSync(priorityOutPath, priorityReport, "utf8");
console.log(`Wrote ${rel(outPath)}`);
console.log(`Wrote ${rel(priorityOutPath)}`);
console.log(
  `stubs=${autoStubs.length} wrappers=${mdWrappers.length} stubPackages=${stubPackages.length} unresolved=${unresolvedLocal.length}`,
);
