import { assetsContract } from "@shared/features/assets/contract";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type CreateAssetRequest = z.input<
  (typeof assetsContract)["commands"]["assets.create"]["input"]
>;
export type CreateAssetResult = z.infer<
  (typeof assetsContract)["commands"]["assets.create"]["output"]
>;
export type CopyAssetRequest = z.input<(typeof assetsContract)["commands"]["assets.copy"]["input"]>;
export type CopyAssetResult = z.infer<(typeof assetsContract)["commands"]["assets.copy"]["output"]>;
export type ResolveAssetRequest = z.input<
  (typeof assetsContract)["commands"]["assets.resolve"]["input"]
>;
export type ResolveAssetResult = z.infer<
  (typeof assetsContract)["commands"]["assets.resolve"]["output"]
>;

export const createAsset = (req: CreateAssetRequest): Promise<CreateAssetResult> =>
  invokeCommand("assets.create", req);

export const copyAsset = (req: CopyAssetRequest): Promise<CopyAssetResult> =>
  invokeCommand("assets.copy", req);

export const resolveAsset = (req: ResolveAssetRequest): Promise<ResolveAssetResult> =>
  invokeCommand("assets.resolve", req);

export function convertFileSrc(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }

  return `file://${path}`;
}
