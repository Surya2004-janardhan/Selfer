export const NonNullableUsage = Object.freeze({
  required: [
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "output_tokens",
    "server_tool_use",
    "service_tier",
    "cache_creation",
    "inference_geo",
    "iterations",
    "speed",
  ],
});

export function createEmptyUsage() {
  return {
    input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    output_tokens: 0,
    server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
    service_tier: "standard",
    cache_creation: {
      ephemeral_1h_input_tokens: 0,
      ephemeral_5m_input_tokens: 0,
    },
    inference_geo: "",
    iterations: [],
    speed: "standard",
  };
}

export default NonNullableUsage;
