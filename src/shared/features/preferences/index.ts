import type { z } from "zod";

import type { preferencesIpcCommandContracts } from "./ipc-commands";

export { preferencesIpcCommandContracts } from "./ipc-commands";

export type PreferencesSnapshot = z.infer<
  (typeof preferencesIpcCommandContracts)["preferencesRead"]["response"]
>;
