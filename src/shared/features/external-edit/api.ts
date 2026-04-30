import { command, defineFeatureApi, event } from "@shared/ipc/feature-api";
import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { externalEditSessionSchema } from "./session-contracts";

const voidSchema = z.undefined();

export const externalEditSessionsChangedPayloadSchema = z.array(externalEditSessionSchema);
export type ExternalEditSessionsChangedPayload = z.infer<
  typeof externalEditSessionsChangedPayloadSchema
>;

export const externalEditApi = defineFeatureApi({
  commands: {
    cancel: command({
      request: z.object({
        editId: z.string().min(1),
      }),
      response: voidSchema,
    }),
    list: command({
      request: voidSchema,
      response: z.array(externalEditSessionSchema),
    }),
    submit: command({
      request: z.object({
        editId: z.string().min(1),
        content: z.string(),
      }),
      response: blockSchema,
    }),
  },
  events: {
    sessionsChanged: event({
      payload: externalEditSessionsChangedPayloadSchema,
    }),
  },
  name: "externalEdit",
});
