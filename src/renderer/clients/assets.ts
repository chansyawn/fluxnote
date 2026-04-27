import { invokeCommand } from "@renderer/app/invoke";
import type {
  CopyAssetRequest,
  CopyAssetResult,
  CreateAssetRequest,
  CreateAssetResult,
} from "@shared/features/assets";

export type {
  CopyAssetRequest,
  CopyAssetResult,
  CreateAssetRequest,
  CreateAssetResult,
} from "@shared/features/assets";

export const createAsset = (req: CreateAssetRequest): Promise<CreateAssetResult> =>
  invokeCommand("assetsCreate", req);

export const copyAsset = (req: CopyAssetRequest): Promise<CopyAssetResult> =>
  invokeCommand("assetsCopy", req);

export function convertFileSrc(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }

  return `file://${path}`;
}
