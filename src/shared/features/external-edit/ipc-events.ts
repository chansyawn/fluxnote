import { z } from "zod";

import { externalEditSessionSchema } from "./session-contracts";

export const externalEditSessionsChangedPayloadSchema = z.array(externalEditSessionSchema);
export type ExternalEditSessionsChangedPayload = z.infer<
  typeof externalEditSessionsChangedPayloadSchema
>;

export const externalEditIpcEventContracts = {
  externalEditSessionsChanged: {
    channel: "fluxnote:event:external-edit://sessions-changed",
    payload: externalEditSessionsChangedPayloadSchema,
  },
} as const;
