import fs from "node:fs/promises";
import JSON5 from "json5";
import { DEFAULT_AGENT_WORKSPACE_DIR, ensureAgentWorkspace } from "../agents/workspace.js";
import { type SelferConfig, createConfigIO, writeConfigFile } from "../config/config.js";
import { formatConfigPath, logConfigUpdated } from "../config/logging.js";
import { resolveSessionTranscriptsDir } from "../config/sessions.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";

async function readConfigFileRaw(configPath: string): Promise<{
  exists: boolean;
  parsed: SelferConfig;
}> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON5.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { exists: true, parsed: parsed as SelferConfig };
    }
    return { exists: true, parsed: {} };
  } catch {
    return { exists: false, parsed: {} };
  }
}

export async function initCommand(
  opts?: { workspace?: string },
  runtime: RuntimeEnv = defaultRuntime,
) {
  const desiredWorkspace =
    typeof opts?.workspace === "string" && opts.workspace.trim()
      ? opts.workspace.trim()
      : undefined;

  const io = createConfigIO();
  const configPath = io.configPath;
  const existingRaw = await readConfigFileRaw(configPath);
  const cfg = existingRaw.parsed;
  const defaults = cfg.agents?.defaults ?? {};

  const workspace = desiredWorkspace ?? defaults.workspace ?? DEFAULT_AGENT_WORKSPACE_DIR;

  // Enforce Ollama as default
  const ollamaProvider = {
    url: "http://localhost:11434",
    models: [
      { id: "llama3:8b", alias: "default" }
    ]
  };

  const providers = {
    ...cfg.models?.providers,
    ollama: ollamaProvider
  };

  const next: SelferConfig = {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...defaults,
        workspace,
        model: "ollama/llama3:8b",
        identity: {
          name: "Selfer",
          emoji: "🦞"
        }
      },
    },
    models: {
      ...cfg.models,
      providers
    }
  };

  await writeConfigFile(next);
  if (!existingRaw.exists) {
    runtime.log(`Initialized Selfer config with Ollama defaults at ${formatConfigPath(configPath)}`);
  } else {
    logConfigUpdated(runtime, { path: configPath, suffix: "(applied Ollama defaults and workspace)" });
  }

  const ws = await ensureAgentWorkspace({
    dir: workspace,
    ensureBootstrapFiles: !next.agents?.defaults?.skipBootstrap,
  });
  runtime.log(`Workspace OK: ${shortenHomePath(ws.dir)}`);

  const sessionsDir = resolveSessionTranscriptsDir();
  await fs.mkdir(sessionsDir, { recursive: true });
  runtime.log(`Sessions OK: ${shortenHomePath(sessionsDir)}`);
}
