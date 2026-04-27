import type { z } from "zod";

import type { externalEditIpcCommandContracts } from "./ipc-commands";

export { externalEditIpcCommandContracts } from "./ipc-commands";
export {
  externalEditSessionsChangedPayloadSchema,
  externalEditIpcEventContracts,
  type ExternalEditSessionsChangedPayload,
} from "./ipc-events";
export {
  externalEditResultSchema,
  externalEditSessionSchema,
  type ExternalEditResult,
  type ExternalEditSession,
} from "./session-contracts";

export type ExternalEditCancelRequest = z.input<
  (typeof externalEditIpcCommandContracts)["externalEditsCancel"]["request"]
>;
export type ExternalEditSubmitRequest = z.input<
  (typeof externalEditIpcCommandContracts)["externalEditsSubmit"]["request"]
>;
