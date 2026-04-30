import { z } from "zod";

import { settingsPatchSchema, settingsSchema } from "./settings";

const voidSchema = z.undefined();

export const preferencesIpcCommandContracts = {
  preferencesRead: {
    channel: "fluxnotes:preferences:read",
    request: voidSchema,
    response: settingsSchema,
  },
  preferencesPatch: {
    channel: "fluxnotes:preferences:patch",
    request: settingsPatchSchema,
    response: settingsSchema,
  },
  preferencesReset: {
    channel: "fluxnotes:preferences:reset",
    request: voidSchema,
    response: settingsSchema,
  },
} as const;
