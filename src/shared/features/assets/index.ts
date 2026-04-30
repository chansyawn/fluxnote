import type { z } from "zod";

import type { assetsApi } from "./api";

export { assetsApi } from "./api";

export type CreateAssetRequest = z.input<(typeof assetsApi)["commands"]["create"]["request"]>;
export type CreateAssetResult = z.infer<(typeof assetsApi)["commands"]["create"]["response"]>;
export type CopyAssetRequest = z.input<(typeof assetsApi)["commands"]["copy"]["request"]>;
export type CopyAssetResult = z.infer<(typeof assetsApi)["commands"]["copy"]["response"]>;
