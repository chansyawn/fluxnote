import type { z } from "zod";

import type { shortcutIpcCommandContracts } from "./ipc-commands";

export { shortcutIpcCommandContracts } from "./ipc-commands";
export {
  shortcutIpcEventContracts,
  shortcutPressedPayloadSchema,
  type ShortcutPressedPayload,
} from "./ipc-events";

export type ShortcutRequest = z.input<
  (typeof shortcutIpcCommandContracts)["shortcutRegister"]["request"]
>;
