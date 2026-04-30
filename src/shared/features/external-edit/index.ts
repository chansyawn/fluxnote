import type { z } from "zod";

import type { externalEditApi } from "./api";

export {
  externalEditSessionsChangedPayloadSchema,
  externalEditApi,
  type ExternalEditSessionsChangedPayload,
} from "./api";
export {
  externalEditResultSchema,
  externalEditSessionSchema,
  type ExternalEditResult,
  type ExternalEditSession,
} from "./session-contracts";

export type ExternalEditCancelRequest = z.input<
  (typeof externalEditApi)["commands"]["cancel"]["request"]
>;
export type ExternalEditSubmitRequest = z.input<
  (typeof externalEditApi)["commands"]["submit"]["request"]
>;
