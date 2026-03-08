import type { ChatType } from "../../channels/chat-type.js";
import { getChannelPlugin } from "../../channels/plugins/index.js";
import type { ChannelId } from "../../channels/plugins/types.js";
import type { SelferConfig } from "../../config/config.js";
import { buildAgentSessionKey, type RoutePeer } from "../../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../../routing/session-key.js";
import { buildTelegramGroupPeerId } from "../../telegram/bot/helpers.js";
import { resolveTelegramTargetChatType } from "../../telegram/inline-buttons.js";
import { parseTelegramThreadId } from "../../telegram/outbound-params.js";
import { parseTelegramTarget } from "../../telegram/targets.js";
import type { ResolvedMessagingTarget } from "./target-resolver.js";
import { resolveStorePath, updateLastRoute } from "../../config/sessions.js";

export type OutboundSessionRoute = {
  sessionKey: string;
  baseSessionKey: string;
  peer: RoutePeer;
  chatType: "direct" | "group" | "channel";
  from: string;
  to: string;
  threadId?: string | number;
};

export type ResolveOutboundSessionRouteParams = {
  cfg: SelferConfig;
  channel: ChannelId;
  agentId: string;
  accountId?: string | null;
  target: string;
  resolvedTarget?: ResolvedMessagingTarget;
  replyToId?: string | null;
  threadId?: string | number | null;
};

function normalizeThreadId(value?: string | number | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return String(Math.trunc(value));
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildBaseSessionKey(params: {
  cfg: SelferConfig;
  agentId: string;
  channel: ChannelId;
  accountId?: string | null;
  peer: RoutePeer;
}): string {
  return buildAgentSessionKey({
    agentId: params.agentId,
    channel: params.channel,
    accountId: params.accountId,
    peer: params.peer,
    dmScope: params.cfg.session?.dmScope ?? "main",
    identityLinks: params.cfg.session?.identityLinks,
  });
}

function resolveTelegramSession(
  params: ResolveOutboundSessionRouteParams,
): OutboundSessionRoute | null {
  const parsed = parseTelegramTarget(params.target);
  const chatId = parsed.chatId.trim();
  if (!chatId) {
    return null;
  }
  const parsedThreadId = parsed.messageThreadId;
  const fallbackThreadId = normalizeThreadId(params.threadId);
  const resolvedThreadId = parsedThreadId ?? parseTelegramThreadId(fallbackThreadId);
  const chatType = resolveTelegramTargetChatType(params.target);
  const isGroup =
    chatType === "group" ||
    (chatType === "unknown" &&
      params.resolvedTarget?.kind &&
      params.resolvedTarget.kind !== "user");
  const peerId =
    isGroup && resolvedThreadId ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : chatId;
  const peer: RoutePeer = {
    kind: isGroup ? "group" : "direct",
    id: peerId,
  };
  const baseSessionKey = buildBaseSessionKey({
    cfg: params.cfg,
    agentId: params.agentId,
    channel: "telegram",
    accountId: params.accountId,
    peer,
  });
  const threadKeys =
    resolvedThreadId && !isGroup
      ? { sessionKey: `${baseSessionKey}:thread:${resolvedThreadId}` }
      : null;
  return {
    sessionKey: threadKeys?.sessionKey ?? baseSessionKey,
    baseSessionKey,
    peer,
    chatType: isGroup ? "group" : "direct",
    from: isGroup
      ? `telegram:group:${peerId}`
      : resolvedThreadId
        ? `telegram:${chatId}:topic:${resolvedThreadId}`
        : `telegram:${chatId}`,
    to: `telegram:${chatId}`,
    threadId: resolvedThreadId,
  };
}

export async function resolveOutboundSessionRoute(
  params: ResolveOutboundSessionRouteParams,
): Promise<OutboundSessionRoute | null> {
  const channel = params.channel;
  if (channel === "telegram") {
    return resolveTelegramSession(params);
  }

  // Fallback for generic/CLI channels or others that don't need complex resolution.
  const peer: RoutePeer = {
    kind: params.resolvedTarget?.kind === "group" ? "group" : "direct",
    id: params.target,
  };
  const baseSessionKey = buildBaseSessionKey({
    cfg: params.cfg,
    agentId: params.agentId,
    channel,
    accountId: params.accountId,
    peer,
  });
  const threadId = normalizeThreadId(params.threadId ?? params.replyToId);
  const threadKeys = resolveThreadSessionKeys({
    baseSessionKey,
    threadId,
  });

  return {
    sessionKey: threadKeys.sessionKey,
    baseSessionKey,
    peer,
    chatType: peer.kind === "group" ? "group" : "direct",
    from: `${channel}:${params.target}`,
    to: params.target,
    threadId,
  };
}

export async function ensureOutboundSessionEntry(params: {
  cfg: SelferConfig;
  agentId: string;
  channel: ChannelId;
  accountId?: string | null;
  route: OutboundSessionRoute;
}) {
  const { agentId, channel, accountId, route } = params;
  const storePath = resolveStorePath(undefined, { agentId });
  await updateLastRoute({
    storePath,
    sessionKey: route.sessionKey,
    channel,
    to: route.to,
    accountId: accountId ?? undefined,
    threadId: route.threadId,
  });
}
