const fs = require("fs");
const path = require("path");

const root = path.resolve(process.cwd(), "src-reference");
const stubPkgs = [
  "@ant/claude-for-chrome-mcp",
  "@ant/computer-use-input",
  "@ant/computer-use-mcp",
  "@ant/computer-use-swift",
  "@anthropic-ai/claude-agent-sdk",
  "@anthropic-ai/mcpb",
  "@anthropic-ai/sandbox-runtime",
  "audio-capture.node",
  "code-excerpt",
  "color-diff-napi",
  "modifiers-napi",
];

const pkgMeta = new Map(
  stubPkgs.map((p) => [p, { default: false, named: new Set(), ns: false }]),
);

function getPkg(spec) {
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/");
  return spec.split("/")[0];
}

function parseClause(clause) {
  const meta = { default: false, named: [], ns: false };
  const c = clause.trim();
  if (!c) return meta;

  if (c.startsWith("* as ")) {
    meta.ns = true;
    return meta;
  }

  const namedMatch = c.match(/\{([\s\S]*?)\}/);
  if (namedMatch) {
    const items = namedMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const it of items) {
      const [orig] = it.split(/\s+as\s+/i).map((s) => s.trim());
      if (orig) meta.named.push(orig);
    }
  }

  const before = namedMatch
    ? c.slice(0, namedMatch.index).trim().replace(/,$/, "").trim()
    : c;
  if (before && !before.startsWith("*") && !before.startsWith("{"))
    meta.default = true;

  return meta;
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
    const re = /import\s+([\s\S]*?)\s+from\s+['"]([^'"\n]+)['"]/g;
    let m;
    while ((m = re.exec(source))) {
      const clause = m[1];
      const spec = m[2];
      const pkg = getPkg(spec);
      if (!pkgMeta.has(pkg)) continue;
      const parsed = parseClause(clause);
      const meta = pkgMeta.get(pkg);
      meta.default = meta.default || parsed.default;
      meta.ns = meta.ns || parsed.ns;
      for (const n of parsed.named) meta.named.add(n);
    }
  }
}

walk(root);

for (const [pkg, meta] of pkgMeta.entries()) {
  const idx = path.resolve(process.cwd(), "stubs", pkg, "index.js");
  fs.mkdirSync(path.dirname(idx), { recursive: true });
  const lines = [];
  lines.push(
    "// Auto-generated package stub export surface for Node migration",
  );
  lines.push("const __stub = {};");
  if (meta.default || meta.ns || meta.named.size === 0)
    lines.push("export default __stub;");
  for (const n of [...meta.named].sort()) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) continue;
    lines.push(`export const ${n} = __stub;`);
  }
  lines.push("export const __stubModule = true;");
  lines.push("");
  fs.writeFileSync(idx, lines.join("\n"), "utf8");
}

console.log("Updated stub package export surfaces.");
