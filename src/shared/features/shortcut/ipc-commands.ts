import { z } from "zod";

const voidSchema = z.undefined();

export const shortcutIpcCommandContracts = {
  shortcutIsRegistered: {
    channel: "fluxnote:shortcut:is-registered",
    request: z.object({ shortcut: z.string().min(1) }),
    response: z.boolean(),
  },
  shortcutRegister: {
    channel: "fluxnote:shortcut:register",
    request: z.object({ shortcut: z.string().min(1) }),
    response: voidSchema,
  },
  shortcutUnregister: {
    channel: "fluxnote:shortcut:unregister",
    request: z.object({ shortcut: z.string().min(1) }),
    response: voidSchema,
  },
} as const;
