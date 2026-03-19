// `inquirer` is ESM-only in some installations; dynamically import at runtime to avoid
// CommonJS static require issues when compiled to `dist`.

export type PermissionLevel = "read" | "write" | "admin"

// Simple permission map: can be extended to roles, users, policies
const DEFAULT_TOOL_PERMISSIONS: Record<string, PermissionLevel> = {
  read_file: "read",
  write_file: "write",
  run_cmd: "admin",
  rename_file: "write",
  git_commit: "write",
  project_init: "admin",
}

export function getRequiredPermission(toolName: string): PermissionLevel {
  return DEFAULT_TOOL_PERMISSIONS[toolName] || "admin"
}

export async function requestHumanApproval(toolName: string, params: unknown, required: PermissionLevel) {
  // Simple readline-based confirmation prompt to avoid ESM CLI dependencies.
  const summary = typeof params === "string" ? params : JSON.stringify(params, null, 2)
  const message = `Tool: ${toolName}\nRequired permission: ${required}\nParameters:\n${summary}\n\nApprove execution? (y/N): `

  return new Promise<boolean>((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout })
    rl.question(message, (answer: string) => {
      rl.close()
      const ok = !!answer && ['y', 'yes'].includes(answer.trim().toLowerCase())
      resolve(ok)
    })
  })
}

export default { getRequiredPermission, requestHumanApproval }
