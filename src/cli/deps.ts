import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { sendMessageTelegram } from "../telegram/send.js";
import { createOutboundSendDepsFromCliSource } from "./outbound-send-mapping.js";

export type CliDeps = {
  sendMessageTelegram: typeof sendMessageTelegram;
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageTelegram,
  };
}

export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return createOutboundSendDepsFromCliSource(deps);
}
