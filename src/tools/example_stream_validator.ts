import fs from "fs"
import path from "path"
import assembleFunctionCall from "./stream_assembler"
import { validateToolCall } from "./validator"
import { getTool } from "./registry"
import { getRequiredPermission, requestHumanApproval } from "./permission"

async function main() {
  const samplePath = process.argv[2] || path.resolve(process.cwd(), "samples", "sample_chunked.json")
  if (!fs.existsSync(samplePath)) {
    console.error("Sample file not found:", samplePath)
    process.exit(2)
  }

  const raw = fs.readFileSync(samplePath, "utf8")
  const chunks = JSON.parse(raw)

  const assembled = assembleFunctionCall(chunks)
  if (!assembled.ok) {
    console.error("Failed to parse assembled arguments:", assembled.error)
    process.exit(3)
  }

  const toolName = assembled.name
  const params = assembled.args

  const tool = getTool(toolName)
  if (!tool) {
    console.error("Unknown tool:", toolName)
    process.exit(4)
  }

  // Validate against schema
  const validation = validateToolCall({ name: toolName, params })
  if (!validation.ok) {
    console.error("Schema validation failed:", JSON.stringify(validation.error, null, 2))
    process.exit(5)
  }

  // Check permission and request approval if needed
  const required = getRequiredPermission(toolName)
  const approved = await requestHumanApproval(toolName, params, required)
  if (!approved) {
    console.error("Execution not approved by user")
    process.exit(6)
  }

  console.log("Validated and approved. Ready to execute:")
  console.log(JSON.stringify(validation.parsed, null, 2))
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

export default main
