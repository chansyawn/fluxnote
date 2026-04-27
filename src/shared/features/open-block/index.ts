import type { z } from "zod";

import type { openBlockIpcCommandContracts } from "./ipc-commands";

export { openBlockIpcCommandContracts } from "./ipc-commands";
export {
  openBlockRequestedPayloadSchema,
  openBlockIpcEventContracts,
  type OpenBlockRequestedPayload,
} from "./ipc-events";
export { openBlockPendingSchema } from "./models";

export type OpenBlockPending = z.infer<
  (typeof openBlockIpcCommandContracts)["openBlockPendingRead"]["response"]
>;
export type OpenBlockPendingAcknowledgeRequest = z.input<
  (typeof openBlockIpcCommandContracts)["openBlockPendingAcknowledge"]["request"]
>;
