const fs = require("fs");
const path = require("path");

const root = path.resolve(process.cwd(), "src-reference");
const missing = new Map();

function existsAsModule(absPath) {
  if (fs.existsSync(absPath)) return true;
  const exts = [".ts", ".tsx", ".js", ".mjs", ".json"];
  for (const ext of exts) {
    if (fs.existsSync(absPath + ext)) return true;
  }
  if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
    for (const ext of exts) {
      if (fs.existsSync(path.join(absPath, "index" + ext))) return true;
    }
  }
  // import with explicit .js can map to .ts/.tsx source
  if (absPath.endsWith(".js")) {
    const no = absPath.slice(0, -3);
    for (const ext of [".ts", ".tsx"]) {
      if (fs.existsSync(no + ext)) return true;
    }
  }
  return false;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;

    const source = fs.readFileSync(p, "utf8");
    const re =
      /(?:import|export)\s+(?:[^'"`]*?from\s*)?['"]([^'"\n]+)['"]|require\(['"]([^'"\n]+)['"]\)/g;
    let m;
    while ((m = re.exec(source))) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(p), spec);
      if (!existsAsModule(abs)) {
        if (!missing.has(abs)) missing.set(abs, []);
        missing.get(abs).push(p);
      }
    }
  }
}

walk(root);
for (const [abs, from] of [...missing.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  console.log(abs + " <- " + from[0]);
}
console.error("TOTAL_MISSING=" + missing.size);
