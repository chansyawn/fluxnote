import { z } from "zod";

import { settingsPatchSchema, settingsSchema } from "./settings";

const voidSchema = z.undefined();

export const preferencesIpcCommandContracts = {
  preferencesRead: {
    channel: "fluxnote:preferences:read",
    request: voidSchema,
    response: settingsSchema,
  },
  preferencesPatch: {
    channel: "fluxnote:preferences:patch",
    request: settingsPatchSchema,
    response: settingsSchema,
  },
  preferencesReset: {
    channel: "fluxnote:preferences:reset",
    request: voidSchema,
    response: settingsSchema,
  },
} as const;
