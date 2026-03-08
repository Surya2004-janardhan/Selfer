import type { SelferConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: SelferConfig, pluginId: string): SelferConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
