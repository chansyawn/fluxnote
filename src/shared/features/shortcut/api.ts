import { command, defineFeatureApi, event } from "@shared/ipc/feature-api";
import { z } from "zod";

const voidSchema = z.undefined();
const shortcutRequestSchema = z.object({ shortcut: z.string().min(1) });

export const shortcutPressedPayloadSchema = z.object({
  shortcut: z.string(),
  state: z.enum(["Pressed", "Released"]),
});
export type ShortcutPressedPayload = z.infer<typeof shortcutPressedPayloadSchema>;

export const shortcutApi = defineFeatureApi({
  commands: {
    isRegistered: command({
      request: shortcutRequestSchema,
      response: z.boolean(),
    }),
    register: command({
      request: shortcutRequestSchema,
      response: voidSchema,
    }),
    unregister: command({
      request: shortcutRequestSchema,
      response: voidSchema,
    }),
  },
  events: {
    pressed: event({
      payload: shortcutPressedPayloadSchema,
    }),
  },
  name: "shortcut",
});
