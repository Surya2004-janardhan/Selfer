const fs = require("fs");
const path = require("path");

const root = path.resolve(process.cwd(), "src-reference");
const sourceExt = /\.(ts|tsx|js|mjs)$/;
let rewrites = 0;
const mdTargets = new Set();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!sourceExt.test(entry.name)) continue;

    let src = fs.readFileSync(p, "utf8");
    const re = /(['"])(\.\.?\/[^'"\n]+\.md)\1/g;
    let changed = false;
    src = src.replace(re, (full, quote, rel) => {
      const absMd = path.resolve(path.dirname(p), rel);
      mdTargets.add(absMd);
      changed = true;
      return `${quote}${rel}.js${quote}`;
    });

    if (changed) {
      fs.writeFileSync(p, src, "utf8");
      rewrites++;
    }
  }
}

function ensureMdWrapper(absMdPath) {
  if (!fs.existsSync(absMdPath)) {
    fs.mkdirSync(path.dirname(absMdPath), { recursive: true });
    fs.writeFileSync(absMdPath, "# Placeholder\n", "utf8");
  }
  const wrapper = absMdPath + ".js";
  if (fs.existsSync(wrapper)) return;

  const rel = "./" + path.basename(absMdPath);
  const content = [
    "import fs from 'fs';",
    "import path from 'path';",
    "const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), " +
      JSON.stringify(path.basename(absMdPath)) +
      ");",
    "const text = fs.readFileSync(filePath, 'utf8');",
    "export default text;",
    "",
  ].join("\n");
  fs.writeFileSync(wrapper, content, "utf8");
}

walk(root);
for (const absMd of mdTargets) {
  ensureMdWrapper(absMd);
}

console.log(
  `Rewrote ${rewrites} source files and generated ${mdTargets.size} md wrappers.`,
);
