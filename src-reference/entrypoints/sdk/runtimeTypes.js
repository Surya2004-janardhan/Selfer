const marker = Object.freeze({ kind: "sdk-runtime-type" });

export const AnyZodRawShape = marker;
export const InferShape = marker;
export const InternalQuery = marker;
export const Query = marker;
export const Options = marker;
export const InternalOptions = marker;
export const SDKSession = marker;
export const SDKSessionOptions = marker;
export const SdkMcpToolDefinition = marker;
export const McpSdkServerConfigWithInstance = marker;
export const ListSessionsOptions = marker;
export const GetSessionInfoOptions = marker;
export const GetSessionMessagesOptions = marker;
export const SessionMutationOptions = marker;
export const SessionMessage = marker;
export const ForkSessionOptions = marker;

export const ForkSessionResult = Object.freeze({
  kind: "ForkSessionResult",
  required: ["sessionId"],
});

export default Query;
