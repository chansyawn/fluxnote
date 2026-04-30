import { command, defineFeatureApi } from "@shared/ipc/feature-api";
import { z } from "zod";

const voidSchema = z.undefined();

export const cliApi = defineFeatureApi({
  commands: {
    install: command({
      request: voidSchema,
      response: voidSchema,
    }),
    status: command({
      request: voidSchema,
      response: z.object({
        installed: z.boolean(),
      }),
    }),
    uninstall: command({
      request: voidSchema,
      response: voidSchema,
    }),
  },
  name: "cli",
});
