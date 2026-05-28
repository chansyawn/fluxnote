import { z } from "zod";

import { userPreferencesPatchSchema, userPreferencesSchema } from "./user-preferences";

const voidSchema = z.undefined();

export const preferencesContract = {
  commands: {
    "preferences.patch": {
      input: userPreferencesPatchSchema,
      output: userPreferencesSchema,
    },
    "preferences.read": {
      input: voidSchema,
      output: userPreferencesSchema,
    },
    "preferences.reset": {
      input: voidSchema,
      output: userPreferencesSchema,
    },
  },
  events: {
    "preferences.changed": userPreferencesSchema,
  },
} as const;
