import type { z } from "zod";

import type { preferencesIpcCommandContracts } from "./ipc-commands";

export {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  AUTO_ARCHIVE_DURATION_UNITS,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  AUTO_ARCHIVE_MIN_IDLE_MINUTES,
  convertAutoArchiveDurationUnit,
  isAutoArchiveDurationUnit,
  normalizeAutoArchiveIdleMinutes,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
  type AutoArchiveDuration,
  type AutoArchiveDurationUnit,
} from "./auto-archive";
export { preferencesIpcCommandContracts } from "./ipc-commands";

export type PreferencesSnapshot = z.infer<
  (typeof preferencesIpcCommandContracts)["preferencesRead"]["response"]
>;
