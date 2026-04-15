const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src-reference");
const outPath = path.join(repoRoot, "MIGRATION_REPORT.md");

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

fs.writeFileSync(outPath, report, "utf8");
console.log(`Wrote ${rel(outPath)}`);
console.log(
  `stubs=${autoStubs.length} wrappers=${mdWrappers.length} stubPackages=${stubPackages.length} unresolved=${unresolvedLocal.length}`,
);
