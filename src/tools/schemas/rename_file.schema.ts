import { z } from "zod"

export const RenameFileSchema = z.object({
  old_path: z.string().min(1),
  new_path: z.string().min(1),
})

export type RenameFileArgs = z.infer<typeof RenameFileSchema>

export default RenameFileSchema
