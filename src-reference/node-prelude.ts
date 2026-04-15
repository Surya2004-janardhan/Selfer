import { MACRO as macroConfig } from './shims/macro.js';

// Provide Bun compatibility object for node runtime.
if (!(globalThis as any).Bun) {
  (globalThis as any).Bun = {
    version: process.versions.node,
    argv: process.argv,
    env: process.env,
    file: (p: string) => ({ path: p }),
    cwd: () => process.cwd()
  };
}

if (!(globalThis as any).MACRO) {
  (globalThis as any).MACRO = macroConfig;
}
