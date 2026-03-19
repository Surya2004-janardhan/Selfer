import ReadFileSchema from "./schemas/read_file.schema"
import WriteFileSchema from "./schemas/write_file.schema"
import RunCmdSchema from "./schemas/run_cmd.schema"
import RenameFileSchema from "./schemas/rename_file.schema"
import GitCommitSchema from "./schemas/git_commit.schema"
import ProjectInitSchema from "./schemas/project_init.schema"

export type ToolEntry = {
  name: string
  description: string
  schema: any
  permission: "read" | "write" | "admin"
}

export const TOOL_REGISTRY: ToolEntry[] = [
  {
    name: "read_file",
    description: "Read file contents",
    schema: ReadFileSchema,
    permission: "read",
  },
  {
    name: "write_file",
    description: "Create or update files",
    schema: WriteFileSchema,
    permission: "write",
  },
  {
    name: "run_cmd",
    description: "Run a shell command",
    schema: RunCmdSchema,
    permission: "admin",
  },
  {
    name: "rename_file",
    description: "Rename a file",
    schema: RenameFileSchema,
    permission: "write",
  },
  {
    name: "git_commit",
    description: "Create a git commit",
    schema: GitCommitSchema,
    permission: "write",
  },
  {
    name: "project_init",
    description: "Initialize a project (npm/venv)",
    schema: ProjectInitSchema,
    permission: "admin",
  },
]

export function getTool(name: string) {
  return TOOL_REGISTRY.find((t) => t.name === name)
}

export default TOOL_REGISTRY
