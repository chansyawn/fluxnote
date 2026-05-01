import type { z } from "zod";

import type { assetsContract } from "./contract";

export { assetsContract } from "./contract";

export type CreateAssetRequest = z.input<
  (typeof assetsContract)["commands"]["assets.create"]["input"]
>;
export type CreateAssetResult = z.infer<
  (typeof assetsContract)["commands"]["assets.create"]["output"]
>;
export type CopyAssetRequest = z.input<(typeof assetsContract)["commands"]["assets.copy"]["input"]>;
export type CopyAssetResult = z.infer<(typeof assetsContract)["commands"]["assets.copy"]["output"]>;
