import { z } from "zod"

export const GitCommitSchema = z.object({
  message: z.string().min(1),
  files: z.array(z.string()).optional(),
  amend: z.boolean().optional(),
})

export type GitCommitArgs = z.infer<typeof GitCommitSchema>

export default GitCommitSchema
