import { z } from "zod";

import { settingsPatchSchema, settingsSchema } from "./settings";

const voidSchema = z.undefined();

export const preferencesContract = {
  commands: {
    "preferences.patch": {
      input: settingsPatchSchema,
      output: settingsSchema,
    },
    "preferences.read": {
      input: voidSchema,
      output: settingsSchema,
    },
    "preferences.reset": {
      input: voidSchema,
      output: settingsSchema,
    },
  },
  events: {},
} as const;
