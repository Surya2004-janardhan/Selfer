#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { z } from "zod"
import TOOL_REGISTRY, { getTool } from "./registry"

type ToolCall = {
  name: string
  params: unknown
}

export function validateToolCall(toolCall: ToolCall) {
  const entry = getTool(toolCall.name)
  if (!entry) throw new Error(`Unknown tool: ${toolCall.name}`)

  try {
    const parsed = entry.schema.parse(toolCall.params)
    return { ok: true, parsed }
  } catch (err) {
    if (err instanceof z.ZodError) {
      // zod exposes validation issues on `issues`
      // adapt to a simpler shape for consumers
      return { ok: false, error: (err as any).issues || (err as any).errors }
    }
    throw err
  }
}

// CLI: node dist/src/tools/validator.js <json-file>
if (require.main === module) {
  const arg = process.argv[2]
  if (!arg) {
    console.error("Usage: validator <tool-call.json>")
    process.exit(2)
  }

  const filePath = path.resolve(process.cwd(), arg)
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath)
    process.exit(2)
  }

  const raw = fs.readFileSync(filePath, "utf8")
  try {
    const json = JSON.parse(raw)
    const res = validateToolCall(json)
    if (res.ok) {
      console.log("VALID", JSON.stringify(res.parsed, null, 2))
      process.exit(0)
    } else {
      console.error("INVALID", JSON.stringify(res.error, null, 2))
      process.exit(3)
    }
  } catch (e: any) {
    console.error("Error:", e.message)
    process.exit(2)
  }
}

export default validateToolCall
