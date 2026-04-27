import { z } from "zod";

export const shortcutPressedPayloadSchema = z.object({
  shortcut: z.string(),
  state: z.enum(["Pressed", "Released"]),
});
export type ShortcutPressedPayload = z.infer<typeof shortcutPressedPayloadSchema>;

export const shortcutIpcEventContracts = {
  shortcutPressed: {
    channel: "fluxnote:event:shortcut://pressed",
    payload: shortcutPressedPayloadSchema,
  },
} as const;
