import type { z } from "zod";

import type { openBlockContract } from "./contract";

export {
  openBlockRequestedPayloadSchema,
  openBlockContract,
  type OpenBlockRequestedPayload,
} from "./contract";
export { openBlockPendingSchema } from "./models";

export type OpenBlockPending = z.infer<
  (typeof openBlockContract)["commands"]["openBlock.readPending"]["output"]
>;
export type OpenBlockPendingAcknowledgeRequest = z.input<
  (typeof openBlockContract)["commands"]["openBlock.acknowledgePending"]["input"]
>;
