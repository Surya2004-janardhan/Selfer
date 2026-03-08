// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to symbols used under extensions/diffs.

export type { SelferConfig } from "../config/config.js";
export { resolvePreferredSelferTmpDir } from "../infra/tmp-Selfer-dir.js";
export type {
  AnyAgentTool,
  SelferPluginApi,
  SelferPluginConfigSchema,
  PluginLogger,
} from "../plugins/types.js";
