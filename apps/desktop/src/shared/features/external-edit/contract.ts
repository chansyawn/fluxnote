import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { externalEditSessionSchema } from "./session-contracts";

const voidSchema = z.undefined();

export const externalEditSessionsChangedPayloadSchema = z.array(externalEditSessionSchema);
export type ExternalEditSessionsChangedPayload = z.infer<
  typeof externalEditSessionsChangedPayloadSchema
>;

export const externalEditWriteBackFailedPayloadSchema = z.object({
  blockId: z.string().min(1),
  editId: z.string().min(1),
  reason: z.string().min(1),
});
export type ExternalEditWriteBackFailedPayload = z.infer<
  typeof externalEditWriteBackFailedPayloadSchema
>;

export const externalEditContract = {
  commands: {
    "external-edit.cancel": {
      input: z.object({
        editId: z.string().min(1),
      }),
      output: voidSchema,
    },
    "external-edit.start-focused": {
      input: voidSchema,
      output: externalEditSessionSchema,
    },
    "external-edit.list": {
      input: voidSchema,
      output: z.array(externalEditSessionSchema),
    },
    "external-edit.submit": {
      input: z.object({
        editId: z.string().min(1),
        content: z.string(),
      }),
      output: blockSchema,
    },
  },
  events: {
    "external-edit.sessions-changed": externalEditSessionsChangedPayloadSchema,
    "external-edit.write-back-failed": externalEditWriteBackFailedPayloadSchema,
  },
} as const;
