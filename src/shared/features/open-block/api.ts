import { command, defineFeatureApi, event } from "@shared/ipc/feature-api";
import { z } from "zod";

import { openBlockPendingSchema } from "./models";

const voidSchema = z.undefined();

export const openBlockRequestedPayloadSchema = z.object({
  blockId: z.string(),
});
export type OpenBlockRequestedPayload = z.infer<typeof openBlockRequestedPayloadSchema>;

export const openBlockApi = defineFeatureApi({
  commands: {
    acknowledgePending: command({
      request: z.object({
        blockId: z.string().min(1),
      }),
      response: voidSchema,
    }),
    readPending: command({
      request: voidSchema,
      response: openBlockPendingSchema,
    }),
  },
  events: {
    requested: event({
      payload: openBlockRequestedPayloadSchema,
    }),
  },
  name: "openBlock",
});
