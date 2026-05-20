import { z } from "zod";

import { isTagIcon } from "./icon-options";

export const tagColorValueSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const tagColorSchema = tagColorValueSchema.nullable();
export const tagIconSchema = z
  .string()
  .nullable()
  .refine(isTagIcon, { message: "Invalid tag icon" });

export const tagSchema = z.object({
  color: tagColorSchema,
  id: z.string(),
  icon: tagIconSchema,
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tag = z.infer<typeof tagSchema>;
