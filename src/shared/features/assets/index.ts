import type { z } from "zod";

import type { assetsIpcCommandContracts } from "./ipc-commands";

export { assetsIpcCommandContracts } from "./ipc-commands";

export type CreateAssetRequest = z.input<
  (typeof assetsIpcCommandContracts)["assetsCreate"]["request"]
>;
export type CreateAssetResult = z.infer<
  (typeof assetsIpcCommandContracts)["assetsCreate"]["response"]
>;
export type CopyAssetRequest = z.input<(typeof assetsIpcCommandContracts)["assetsCopy"]["request"]>;
export type CopyAssetResult = z.infer<(typeof assetsIpcCommandContracts)["assetsCopy"]["response"]>;
