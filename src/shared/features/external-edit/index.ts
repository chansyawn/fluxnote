import type { z } from "zod";

import type { externalEditContract } from "./contract";

export {
  externalEditSessionsChangedPayloadSchema,
  externalEditContract,
  type ExternalEditSessionsChangedPayload,
} from "./contract";
export {
  externalEditResultSchema,
  externalEditSessionSchema,
  type ExternalEditResult,
  type ExternalEditSession,
} from "./session-contracts";

export type ExternalEditCancelRequest = z.input<
  (typeof externalEditContract)["commands"]["externalEdit.cancel"]["input"]
>;
export type ExternalEditSubmitRequest = z.input<
  (typeof externalEditContract)["commands"]["externalEdit.submit"]["input"]
>;
