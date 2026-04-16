import { randomUUID } from "crypto";

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

function normalizeModel(model) {
  return (
    process.env.OLLAMA_MODEL ||
    model ||
    process.env.ANTHROPIC_MODEL ||
    "qwen2.5-coder:14b"
  );
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function extractTextFromBlock(block) {
  if (!block || typeof block !== "object") return "";
  if (block.type === "text" && typeof block.text === "string")
    return block.text;
  if (block.type === "tool_result") {
    const content = block.content;
    if (typeof content === "string") return content;
    return JSON.stringify(content ?? "");
  }
  if (block.type === "tool_use") {
    const input = block.input ? JSON.stringify(block.input) : "{}";
    return `[tool_use ${block.name || "tool"}] ${input}`;
  }
  if (
    block.type === "connector_text" &&
    typeof block.connector_text === "string"
  ) {
    return block.connector_text;
  }
  return "";
}

function anthropicContentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(extractTextFromBlock).filter(Boolean).join("\n");
}

function toOllamaMessages(params) {
  const out = [];

  const sys = params.system;
  if (typeof sys === "string" && sys.length > 0) {
    out.push({ role: "system", content: sys });
  } else if (Array.isArray(sys)) {
    const sysText = sys
      .map((block) => (typeof block?.text === "string" ? block.text : ""))
      .filter(Boolean)
      .join("\n");
    if (sysText) {
      out.push({ role: "system", content: sysText });
    }
  }

  for (const message of params.messages || []) {
    const role = message.role === "assistant" ? "assistant" : "user";
    out.push({ role, content: anthropicContentToText(message.content) });
  }

  return out;
}

function toOllamaTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return tools
    .map((tool) => {
      if (!tool || typeof tool !== "object" || typeof tool.name !== "string") {
        return null;
      }
      return {
        type: "function",
        function: {
          name: tool.name,
          description:
            typeof tool.description === "string" ? tool.description : undefined,
          parameters:
            tool.input_schema && typeof tool.input_schema === "object"
              ? tool.input_schema
              : { type: "object", properties: {} },
        },
      };
    })
    .filter(Boolean);
}

function mapToolCallsToAnthropicBlocks(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return [];
  return toolCalls
    .map((call) => {
      const fn = call?.function || {};
      const name = typeof fn.name === "string" ? fn.name : "tool";
      const argsRaw = typeof fn.arguments === "string" ? fn.arguments : "{}";
      let input = {};
      try {
        input = JSON.parse(argsRaw);
      } catch {
        input = {};
      }
      return {
        type: "tool_use",
        id: call?.id || randomUUID(),
        name,
        input,
      };
    })
    .filter(Boolean);
}

function makeApiPromise(executor) {
  const promise = Promise.resolve().then(executor);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
    withResponse: async () => {
      const data = await promise;
      return {
        data,
        request_id: data?.id || randomUUID(),
        response: data?.__rawResponse,
      };
    },
    asResponse: async () => {
      const data = await promise;
      return data?.__rawResponse;
    },
  };
}

async function parseStreamToAnthropicEvents(
  response,
  model,
  controller,
  abortSignal,
) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const requestId = randomUUID();
  let buffer = "";
  let fullText = "";
  let toolCalls = [];
  let stopped = false;

  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  async function* iterator() {
    yield {
      type: "message_start",
      message: {
        id: requestId,
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage,
      },
    };
    yield {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    };

    while (!stopped) {
      if (abortSignal?.aborted || controller.signal.aborted) {
        stopped = true;
        break;
      }
      const next = await reader?.read();
      if (!next) break;
      const { done, value } = next;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          continue;
        }

        const chunk = parsed?.message?.content;
        if (Array.isArray(parsed?.message?.tool_calls)) {
          toolCalls = parsed.message.tool_calls;
        }
        if (typeof chunk === "string" && chunk.length > 0) {
          fullText += chunk;
          usage.output_tokens = estimateTokens(fullText);
          yield {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: chunk },
          };
        }

        if (parsed?.done === true) {
          stopped = true;
          break;
        }
      }
    }

    yield { type: "content_block_stop", index: 0 };

    const mappedToolCalls = mapToolCallsToAnthropicBlocks(toolCalls);
    if (mappedToolCalls.length > 0) {
      for (let i = 0; i < mappedToolCalls.length; i++) {
        const block = mappedToolCalls[i];
        const index = i + 1;
        const inputJson = JSON.stringify(block.input || {});
        yield {
          type: "content_block_start",
          index,
          content_block: {
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: {},
          },
        };
        yield {
          type: "content_block_delta",
          index,
          delta: { type: "input_json_delta", partial_json: inputJson },
        };
        yield { type: "content_block_stop", index };
      }
    }

    const stopReason = mappedToolCalls.length > 0 ? "tool_use" : "end_turn";
    yield {
      type: "message_delta",
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage,
    };
    yield { type: "message_stop" };
  }

  return {
    controller,
    [Symbol.asyncIterator]: iterator,
  };
}

export function createOllamaAnthropicCompatClient() {
  const baseUrl = getOllamaBaseUrl();

  const messages = {
    create(params, options = {}) {
      const call = async () => {
        const model = normalizeModel(params.model);
        const payload = {
          model,
          messages: toOllamaMessages(params),
          tools: toOllamaTools(params.tools),
          stream: !!params.stream,
          options: {
            num_predict:
              typeof params.max_tokens === "number"
                ? params.max_tokens
                : undefined,
            temperature:
              typeof params.temperature === "number"
                ? params.temperature
                : undefined,
          },
        };

        const controller = new AbortController();
        if (options?.signal) {
          options.signal.addEventListener("abort", () => controller.abort(), {
            once: true,
          });
        }

        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(options?.headers || {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Ollama request failed (${response.status}): ${text || response.statusText}`,
          );
        }

        if (params.stream) {
          const stream = await parseStreamToAnthropicEvents(
            response,
            model,
            controller,
            options?.signal,
          );
          stream.__rawResponse = response;
          stream.id = randomUUID();
          return stream;
        }

        const body = await response.json();
        const text = body?.message?.content || "";
        const toolBlocks = mapToolCallsToAnthropicBlocks(
          body?.message?.tool_calls,
        );
        const content = [];
        if (text) {
          content.push({ type: "text", text });
        }
        if (toolBlocks.length > 0) {
          content.push(...toolBlocks);
        }
        const stopReason = toolBlocks.length > 0 ? "tool_use" : "end_turn";
        const result = {
          id: randomUUID(),
          type: "message",
          role: "assistant",
          model,
          content,
          stop_reason: body?.done ? stopReason : null,
          stop_sequence: null,
          usage: {
            input_tokens: estimateTokens(JSON.stringify(payload.messages)),
            output_tokens: estimateTokens(text),
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          __rawResponse: response,
        };
        return result;
      };

      return makeApiPromise(call);
    },

    countTokens(params) {
      const call = async () => {
        const serialized = JSON.stringify(toOllamaMessages(params));
        return {
          input_tokens: estimateTokens(serialized),
          __rawResponse: new Response(null, { status: 200 }),
        };
      };
      return makeApiPromise(call);
    },
  };

  return {
    beta: {
      messages,
    },
  };
}
