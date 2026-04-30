import type { z } from "zod";

import type { shortcutApi } from "./api";

export { shortcutApi, shortcutPressedPayloadSchema, type ShortcutPressedPayload } from "./api";

export type ShortcutRequest = z.input<(typeof shortcutApi)["commands"]["register"]["request"]>;
