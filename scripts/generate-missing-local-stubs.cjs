const fs = require("fs");
const path = require("path");

const root = path.resolve(process.cwd(), "src-reference");

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

function parseImportClause(clause) {
  const out = { default: false, named: new Set(), namespace: false };
  const c = clause.trim();
  if (!c) return out;

  if (c.startsWith("* as ")) {
    out.namespace = true;
    return out;
  }

  const namedMatch = c.match(/\{([\s\S]*?)\}/);
  if (namedMatch) {
    const parts = namedMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      const [orig] = p.split(/\s+as\s+/i).map((s) => s.trim());
      if (orig) out.named.add(orig);
    }
  }

  const beforeNamed = namedMatch
    ? c.slice(0, namedMatch.index).trim().replace(/,$/, "").trim()
    : c;
  if (
    beforeNamed &&
    !beforeNamed.startsWith("{") &&
    !beforeNamed.startsWith("*")
  ) {
    out.default = true;
  }

  return out;
}

const missing = new Map();

function addMissing(abs, info) {
  if (!missing.has(abs)) {
    missing.set(abs, {
      default: false,
      named: new Set(),
      namespace: false,
      refs: new Set(),
    });
  }
  const rec = missing.get(abs);
  rec.default = rec.default || info.default;
  rec.namespace = rec.namespace || info.namespace;
  for (const n of info.named) rec.named.add(n);
  rec.refs.add(info.ref);
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

    const importRe = /import\s+([\s\S]*?)\s+from\s+['"]([^'"\n]+)['"]/g;
    let m;
    while ((m = importRe.exec(source))) {
      const clause = m[1];
      const spec = m[2];
      if (!spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(p), spec);
      if (!existsAsModule(abs)) {
        const parsed = parseImportClause(clause);
        addMissing(abs, { ...parsed, ref: p });
      }
    }

    const sideEffectRe = /import\s+['"]([^'"\n]+)['"]/g;
    while ((m = sideEffectRe.exec(source))) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(p), spec);
      if (!existsAsModule(abs)) {
        addMissing(abs, {
          default: false,
          named: new Set(),
          namespace: false,
          ref: p,
        });
      }
    }

    const reqRe = /require\(['"]([^'"\n]+)['"]\)/g;
    while ((m = reqRe.exec(source))) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(p), spec);
      if (!existsAsModule(abs)) {
        addMissing(abs, {
          default: true,
          named: new Set(),
          namespace: false,
          ref: p,
        });
      }
    }

    const exportRe = /export\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"\n]+)['"]/g;
    while ((m = exportRe.exec(source))) {
      const namesRaw = m[1];
      const spec = m[2];
      if (!spec.startsWith(".")) continue;
      const abs = path.resolve(path.dirname(p), spec);
      if (!existsAsModule(abs)) {
        const names = namesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.split(/\s+as\s+/i)[0].trim());
        addMissing(abs, {
          default: false,
          named: new Set(names),
          namespace: false,
          ref: p,
        });
      }
    }
  }
}

walk(root);

let created = 0;
for (const [abs, meta] of missing.entries()) {
  const ext = path.extname(abs);
  const target = abs;
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (ext === ".md") {
    const placeholder = `# Placeholder\n\nThis file was auto-generated during Node migration.\n`;
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, placeholder, "utf8");
      created++;
    }
    continue;
  }

  const lines = [];
  lines.push(
    "// Auto-generated compatibility stub for missing src-reference module.",
  );
  lines.push("const __stub = {};");
  if (meta.default || meta.namespace || meta.named.size === 0) {
    lines.push("export default __stub;");
  }

  for (const n of [...meta.named].sort()) {
    if (!n || n === "default") continue;
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) {
      lines.push(`export const ${n} = __stub;`);
    }
  }

  lines.push("export const __stubModule = true;");
  lines.push("");

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, lines.join("\n"), "utf8");
    created++;
  }
}

console.log(
  `Generated ${created} stub files for ${missing.size} missing modules.`,
);
