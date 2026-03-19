import { z } from "zod"

export const ProjectInitSchema = z.object({
  type: z.enum(["npm", "venv"]),
  name: z.string().optional(),
  options: z.record(z.string(), z.any()).optional(),
})

export type ProjectInitArgs = z.infer<typeof ProjectInitSchema>

export default ProjectInitSchema
