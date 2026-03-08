import type { SelferConfig } from "../config/types.js";
import {
  resolveChannelGroupRequireMention,
  resolveChannelGroupToolsPolicy,
} from "../config/group-policy.js";
import { requireActivePluginRegistry } from "../plugins/runtime.js";
import { inspectTelegramAccount } from "../telegram/account-inspect.js";
import { normalizeE164 } from "../utils.js";
import {
  resolveTelegramGroupRequireMention,
  resolveTelegramGroupToolPolicy,
} from "./plugins/group-mentions.js";
import type {
  ChannelCapabilities,
  ChannelCommandAdapter,
  ChannelConfigAdapter,
  ChannelElevatedAdapter,
  ChannelGroupAdapter,
  ChannelId,
  ChannelAgentPromptAdapter,
  ChannelMentionAdapter,
  ChannelPlugin,
  ChannelThreadingAdapter,
} from "./plugins/types.js";
import { CHAT_CHANNEL_ORDER, type ChatChannelId, getChatChannelMeta } from "./registry.js";

export type ChannelDock = {
  id: ChannelId;
  capabilities: ChannelCapabilities;
  commands?: ChannelCommandAdapter;
  outbound?: {
    textChunkLimit?: number;
  };
  streaming?: ChannelDockStreaming;
  elevated?: ChannelElevatedAdapter;
  config?: Pick<
    ChannelConfigAdapter<unknown>,
    "resolveAllowFrom" | "formatAllowFrom" | "resolveDefaultTo"
  >;
  groups?: ChannelGroupAdapter;
  mentions?: ChannelMentionAdapter;
  threading?: ChannelThreadingAdapter;
  agentPrompt?: ChannelAgentPromptAdapter;
};

type ChannelDockStreaming = {
  blockStreamingCoalesceDefaults?: {
    minChars?: number;
    idleMs?: number;
  };
};

const stringifyAllowFrom = (allowFrom: Array<string | number>) =>
  allowFrom.map((entry) => String(entry));

const trimAllowFromEntries = (allowFrom: Array<string | number>) =>
  allowFrom.map((entry) => String(entry).trim()).filter(Boolean);

const DEFAULT_OUTBOUND_TEXT_CHUNK_LIMIT_4000 = { textChunkLimit: 4000 };

const DOCKS: Record<ChatChannelId, ChannelDock> = {
  telegram: {
    id: "telegram",
    capabilities: {
      chatTypes: ["direct", "group", "channel", "thread"],
      nativeCommands: true,
      blockStreaming: true,
    },
    outbound: DEFAULT_OUTBOUND_TEXT_CHUNK_LIMIT_4000,
    config: {
      resolveAllowFrom: ({ cfg, accountId }: { cfg: SelferConfig; accountId: string }) =>
        stringifyAllowFrom(inspectTelegramAccount({ cfg, accountId }).config.allowFrom ?? []),
      formatAllowFrom: ({ allowFrom }: { allowFrom: string[] }) =>
        trimAllowFromEntries(allowFrom)
          .map((entry) => entry.replace(/^(telegram|tg):/i, ""))
          .map((entry) => entry.toLowerCase()),
      resolveDefaultTo: ({ cfg, accountId }: { cfg: SelferConfig; accountId: string }) => {
        const val = inspectTelegramAccount({ cfg, accountId }).config.defaultTo;
        return val != null ? String(val) : undefined;
      },
    },
    groups: {
      resolveRequireMention: resolveTelegramGroupRequireMention,
      resolveToolPolicy: resolveTelegramGroupToolPolicy,
    },
    threading: {
      resolveReplyToMode: ({ cfg }: { cfg: SelferConfig }) => cfg.channels?.telegram?.replyToMode ?? "off",
      buildToolContext: ({ context, hasRepliedRef }: { context: any; hasRepliedRef: any }) => {
        // Telegram auto-threading should only use actual thread/topic IDs.
        // ReplyToId is a message ID and causes invalid message_thread_id in DMs.
        const threadId = context.MessageThreadId;
        const rawCurrentMessageId = context.CurrentMessageId;
        const currentMessageId =
          typeof rawCurrentMessageId === "number"
            ? rawCurrentMessageId
            : rawCurrentMessageId?.trim() || undefined;
        return {
          currentChannelId: context.To?.trim() || undefined,
          currentThreadTs: threadId != null ? String(threadId) : undefined,
          currentMessageId,
          hasRepliedRef,
        };
      },
    },
  },
} as unknown as Record<ChatChannelId, ChannelDock>;

function buildDockFromPlugin(plugin: ChannelPlugin): ChannelDock {
  return {
    id: plugin.id,
    capabilities: plugin.capabilities,
    commands: plugin.commands,
    outbound: plugin.outbound?.textChunkLimit
      ? { textChunkLimit: plugin.outbound.textChunkLimit }
      : undefined,
    streaming: plugin.streaming
      ? { blockStreamingCoalesceDefaults: plugin.streaming.blockStreamingCoalesceDefaults }
      : undefined,
    elevated: plugin.elevated,
    config: plugin.config
      ? {
          resolveAllowFrom: plugin.config.resolveAllowFrom,
          formatAllowFrom: plugin.config.formatAllowFrom,
          resolveDefaultTo: plugin.config.resolveDefaultTo,
        }
      : undefined,
    groups: plugin.groups,
    mentions: plugin.mentions,
    threading: plugin.threading,
    agentPrompt: plugin.agentPrompt,
  };
}

function listPluginDockEntries(): Array<{ id: ChannelId; dock: ChannelDock; order?: number }> {
  const registry = requireActivePluginRegistry();
  const entries: Array<{ id: ChannelId; dock: ChannelDock; order?: number }> = [];
  const seen = new Set<string>();
  for (const entry of registry.channels) {
    const plugin = entry.plugin;
    const id = String(plugin.id).trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (CHAT_CHANNEL_ORDER.includes(plugin.id as ChatChannelId)) {
      continue;
    }
    const dock = entry.dock ?? buildDockFromPlugin(plugin);
    entries.push({ id: plugin.id, dock, order: plugin.meta.order });
  }
  return entries;
}

export function listChannelDocks(): ChannelDock[] {
  const baseEntries = CHAT_CHANNEL_ORDER.filter(id => DOCKS[id]).map((id) => ({
    id,
    dock: DOCKS[id],
    order: getChatChannelMeta(id).order,
  }));
  const pluginEntries = listPluginDockEntries();
  const combined = [...baseEntries, ...pluginEntries];
  combined.sort((a, b) => {
    const indexA = CHAT_CHANNEL_ORDER.indexOf(a.id as ChatChannelId);
    const indexB = CHAT_CHANNEL_ORDER.indexOf(b.id as ChatChannelId);
    const orderA = a.order ?? (indexA === -1 ? 999 : indexA);
    const orderB = b.order ?? (indexB === -1 ? 999 : indexB);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  return combined.map((entry) => entry.dock);
}

export function getChannelDock(id: ChannelId): ChannelDock | undefined {
  const core = DOCKS[id as ChatChannelId];
  if (core) {
    return core;
  }
  const registry = requireActivePluginRegistry();
  const pluginEntry = registry.channels.find((entry) => entry.plugin.id === id);
  if (!pluginEntry) {
    return undefined;
  }
  return pluginEntry.dock ?? buildDockFromPlugin(pluginEntry.plugin);
}
