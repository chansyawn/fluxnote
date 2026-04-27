import type { z } from "zod";

import type { cliIpcCommandContracts } from "./ipc-commands";

export { cliIpcCommandContracts } from "./ipc-commands";

export type CliInstallRequest = z.input<(typeof cliIpcCommandContracts)["cliInstall"]["request"]>;
export type CliStatusResult = z.infer<(typeof cliIpcCommandContracts)["cliStatus"]["response"]>;
