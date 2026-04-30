import { command, defineFeatureApi } from "@shared/ipc/feature-api";
import { z } from "zod";

import { settingsPatchSchema, settingsSchema } from "./settings";

const voidSchema = z.undefined();

export const preferencesApi = defineFeatureApi({
  commands: {
    patch: command({
      request: settingsPatchSchema,
      response: settingsSchema,
    }),
    read: command({
      request: voidSchema,
      response: settingsSchema,
    }),
    reset: command({
      request: voidSchema,
      response: settingsSchema,
    }),
  },
  name: "preferences",
});
