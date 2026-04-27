import { z } from "zod";

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tag = z.infer<typeof tagSchema>;
