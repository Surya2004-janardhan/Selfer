const marker = Object.freeze({ kind: "type-marker" });

export const MessageOrigin = Object.freeze({
  HUMAN: "human",
  AGENT: "agent",
  SYSTEM: "system",
});

export const SystemMessageLevel = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
});

export const PartialCompactDirection = Object.freeze({
  FORWARD: "forward",
  BACKWARD: "backward",
});

export const Message = marker;
export const UserMessage = marker;
export const AssistantMessage = marker;
export const AttachmentMessage = marker;
export const SystemMessage = marker;
export const ProgressMessage = marker;
export const HookResultMessage = marker;
export const RenderableMessage = marker;
export const CollapsibleMessage = marker;
export const GroupedToolUseMessage = marker;
export const CollapsedReadSearchGroup = marker;
export const NormalizedMessage = marker;
export const NormalizedUserMessage = marker;
export const NormalizedAssistantMessage = marker;
export const RequestStartEvent = marker;
export const StreamEvent = marker;
export const StopHookInfo = marker;
export const SystemAPIErrorMessage = marker;
export const SystemAgentsKilledMessage = marker;
export const SystemApiMetricsMessage = marker;
export const SystemAwaySummaryMessage = marker;
export const SystemBridgeStatusMessage = marker;
export const SystemCompactBoundaryMessage = marker;
export const SystemInformationalMessage = marker;
export const SystemLocalCommandMessage = marker;
export const SystemMemorySavedMessage = marker;
export const SystemMicrocompactBoundaryMessage = marker;
export const SystemPermissionRetryMessage = marker;
export const SystemScheduledTaskFireMessage = marker;
export const SystemStopHookSummaryMessage = marker;
export const SystemThinkingMessage = marker;
export const SystemTurnDurationMessage = marker;
export const TombstoneMessage = marker;
export const ToolUseSummaryMessage = marker;

export default Message;
