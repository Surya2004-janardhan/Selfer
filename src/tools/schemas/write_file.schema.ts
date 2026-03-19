import { z } from "zod"

const FileItem = z.object({
  path: z.string().min(1),
  content: z.string(),
})

export const WriteFileSchema = z.object({
  explanation: z.string().optional(),
  files: z.array(FileItem).min(1),
})

export type WriteFileArgs = z.infer<typeof WriteFileSchema>

export default WriteFileSchema
