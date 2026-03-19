/**
 * Assemble streamed function_call deltas into a complete function call
 * Expected input: array of delta objects with shape like { function_call: { name?: string, arguments?: string } }
 */
export type StreamChunk = { function_call?: Record<string, string> } | { delta?: { function_call?: Record<string, string> } }

export function assembleFunctionCall(chunks: StreamChunk[]) {
  const acc: Record<string, string> = {}

  for (const ch of chunks) {
    const func = (ch as any).function_call || (ch as any).delta?.function_call
    if (!func) continue
    for (const [k, v] of Object.entries(func)) {
      acc[k] = (acc[k] || "") + (v ?? "")
    }
  }

  const name = acc["name"] || acc["function_name"] || ""
  const argsText = acc["arguments"] || acc["args"] || ""

  try {
    const parsed = argsText ? JSON.parse(argsText) : undefined
    return { ok: true, name, argsText, args: parsed }
  } catch (err: any) {
    return { ok: false, name, argsText, error: err?.message || String(err) }
  }
}

export default assembleFunctionCall
