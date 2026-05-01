import { z } from "zod";

const voidSchema = z.undefined();
const shortcutRequestSchema = z.object({ shortcut: z.string().min(1) });

export const shortcutPressedPayloadSchema = z.object({
  shortcut: z.string(),
  state: z.enum(["Pressed", "Released"]),
});
export type ShortcutPressedPayload = z.infer<typeof shortcutPressedPayloadSchema>;

export const shortcutContract = {
  commands: {
    "shortcut.isRegistered": {
      input: shortcutRequestSchema,
      output: z.boolean(),
    },
    "shortcut.register": {
      input: shortcutRequestSchema,
      output: voidSchema,
    },
    "shortcut.unregister": {
      input: shortcutRequestSchema,
      output: voidSchema,
    },
  },
  events: {
    "shortcut.pressed": shortcutPressedPayloadSchema,
  },
} as const;
