import { z } from "zod"

export const RunCmdSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  timeout: z.number().int().positive().optional(),
})

export type RunCmdArgs = z.infer<typeof RunCmdSchema>

export default RunCmdSchema
