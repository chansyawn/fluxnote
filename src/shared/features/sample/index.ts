import type { z } from "zod";

import type { sampleIpcCommandContracts } from "./ipc-commands";

export { sampleIpcCommandContracts } from "./ipc-commands";

export type GreetRequest = z.input<(typeof sampleIpcCommandContracts)["sampleGreet"]["request"]>;
export type GreetResponse = z.infer<(typeof sampleIpcCommandContracts)["sampleGreet"]["response"]>;
