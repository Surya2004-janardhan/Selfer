#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(here, "../src-reference/entrypoints/cli.tsx");
const localTsx = resolve(here, "../node_modules/.bin/tsx");

const runArgs = process.argv.slice(2);

// Prefer local tsx executable to avoid runtime differences in node --import support.
const command = existsSync(localTsx) ? localTsx : process.execPath;
const commandArgs = existsSync(localTsx)
  ? [entrypoint, ...runArgs]
  : ["--import", "tsx", entrypoint, ...runArgs];

const child = spawn(command, commandArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
