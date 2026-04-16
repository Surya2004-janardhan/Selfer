export const CONTROL_REQUEST_TYPE = "control_request";
export const CONTROL_RESPONSE_TYPE = "control_response";
export const CONTROL_CANCEL_REQUEST_TYPE = "control_cancel_request";

export const SDKControlRequestInner = Object.freeze({
  kind: "SDKControlRequestInner",
});

export const SDKControlRequest = Object.freeze({
  type: CONTROL_REQUEST_TYPE,
  fields: ["request_id", "request"],
});

export const SDKControlPermissionRequest = Object.freeze({
  subtype: "can_use_tool",
});

export const SDKControlResponse = Object.freeze({
  type: CONTROL_RESPONSE_TYPE,
  fields: ["response"],
});

export const SDKControlCancelRequest = Object.freeze({
  type: CONTROL_CANCEL_REQUEST_TYPE,
  fields: ["request_id"],
});

export const StdoutMessage = Object.freeze({
  kinds: [
    "user",
    "assistant",
    "result",
    "system",
    CONTROL_REQUEST_TYPE,
    CONTROL_RESPONSE_TYPE,
  ],
});

export function isControlRequest(value) {
  return (
    !!value &&
    typeof value === "object" &&
    value.type === CONTROL_REQUEST_TYPE &&
    typeof value.request_id === "string" &&
    value.request != null
  );
}

export function isControlResponse(value) {
  return (
    !!value &&
    typeof value === "object" &&
    value.type === CONTROL_RESPONSE_TYPE &&
    value.response != null
  );
}

export default SDKControlRequest;
