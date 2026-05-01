import type { z } from "zod";

import type { cliContract } from "./contract";

export { cliContract } from "./contract";

export type CliInstallRequest = z.input<(typeof cliContract)["commands"]["cli.install"]["input"]>;
export type CliStatusResult = z.infer<(typeof cliContract)["commands"]["cli.status"]["output"]>;
