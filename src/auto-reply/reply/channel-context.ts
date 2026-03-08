type ChannelSurfaceParams = {
  ctx: {
    OriginatingChannel?: string;
    Surface?: string;
    Provider?: string;
    AccountId?: string;
  };
  command: {
    channel?: string;
  };
};

type AccountParams = {
  ctx: {
    AccountId?: string;
  };
};

export function isTelegramSurface(params: ChannelSurfaceParams): boolean {
  return resolveCommandSurfaceChannel(params) === "telegram";
}

export function resolveCommandSurfaceChannel(params: ChannelSurfaceParams): string {
  const channel =
    params.ctx.OriginatingChannel ??
    params.command.channel ??
    params.ctx.Surface ??
    params.ctx.Provider;
  return String(channel ?? "")
    .trim()
    .toLowerCase();
}

export function resolveChannelAccountId(params: AccountParams): string {
  const accountId = typeof params.ctx.AccountId === "string" ? params.ctx.AccountId.trim() : "";
  return accountId || "default";
}
