const fs = require("fs");
const path = require("path");
const mod = require("module");

const builtins = new Set(
  mod.builtinModules.concat(mod.builtinModules.map((m) => `node:${m}`)),
);
const root = path.resolve(process.cwd(), "src-reference");
const external = new Set();

function addSpec(spec) {
  if (!spec) return;
  if (
    spec.startsWith(".") ||
    spec.startsWith("src/") ||
    spec.startsWith("src-reference/") ||
    spec.startsWith("bun:")
  )
    return;
  const pkg = spec.startsWith("@")
    ? spec.split("/").slice(0, 2).join("/")
    : spec.split("/")[0];
  if (!builtins.has(pkg)) external.add(pkg);
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
      addSpec(m[1] || m[2]);
    }
  }
}

walk(root);
const list = [...external].sort();
process.stdout.write(list.join(" ") + "\n");
