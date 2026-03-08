import type { SelferConfig } from "../config/config.js";
import { collectChannelSecretAssignments } from "./runtime-config-collectors-channels.js";
import { collectCoreConfigAssignments } from "./runtime-config-collectors-core.js";
import type { ResolverContext } from "./runtime-shared.js";

export function collectConfigAssignments(params: {
  config: SelferConfig;
  context: ResolverContext;
}): void {
  const defaults = params.context.sourceConfig.secrets?.defaults;

  collectCoreConfigAssignments({
    config: params.config,
    defaults,
    context: params.context,
  });

  collectChannelSecretAssignments({
    config: params.config,
    defaults,
    context: params.context,
  });
}
