import type { z } from "zod";

import type { cliApi } from "./api";

export { cliApi } from "./api";

export type CliInstallRequest = z.input<(typeof cliApi)["commands"]["install"]["request"]>;
export type CliStatusResult = z.infer<(typeof cliApi)["commands"]["status"]["response"]>;
