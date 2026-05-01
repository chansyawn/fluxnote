import type { z } from "zod";

import type { shortcutContract } from "./contract";

export {
  shortcutContract,
  shortcutPressedPayloadSchema,
  type ShortcutPressedPayload,
} from "./contract";

export type ShortcutRequest = z.input<
  (typeof shortcutContract)["commands"]["shortcut.register"]["input"]
>;
