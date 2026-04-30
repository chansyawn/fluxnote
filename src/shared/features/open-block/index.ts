import type { z } from "zod";

import type { openBlockApi } from "./api";

export {
  openBlockRequestedPayloadSchema,
  openBlockApi,
  type OpenBlockRequestedPayload,
} from "./api";
export { openBlockPendingSchema } from "./models";

export type OpenBlockPending = z.infer<
  (typeof openBlockApi)["commands"]["readPending"]["response"]
>;
export type OpenBlockPendingAcknowledgeRequest = z.input<
  (typeof openBlockApi)["commands"]["acknowledgePending"]["request"]
>;
