import { z } from "zod"

export const ReadFileSchema = z.object({
  path: z.string().min(1),
  encoding: z.string().optional(),
})

export type ReadFileArgs = z.infer<typeof ReadFileSchema>

export default ReadFileSchema
