import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { externalEditSessionSchema } from "./session-contracts";

const voidSchema = z.undefined();

export const externalEditSessionsChangedPayloadSchema = z.array(externalEditSessionSchema);
export type ExternalEditSessionsChangedPayload = z.infer<
  typeof externalEditSessionsChangedPayloadSchema
>;

export const externalEditContract = {
  commands: {
    "externalEdit.cancel": {
      input: z.object({
        editId: z.string().min(1),
      }),
      output: voidSchema,
    },
    "externalEdit.list": {
      input: voidSchema,
      output: z.array(externalEditSessionSchema),
    },
    "externalEdit.submit": {
      input: z.object({
        editId: z.string().min(1),
        content: z.string(),
      }),
      output: blockSchema,
    },
  },
  events: {
    "externalEdit.sessionsChanged": externalEditSessionsChangedPayloadSchema,
  },
} as const;
