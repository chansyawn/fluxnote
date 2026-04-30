import { createFeatureClient } from "@renderer/app/ipc-client";
import type {
  CopyAssetRequest,
  CopyAssetResult,
  CreateAssetRequest,
  CreateAssetResult,
} from "@shared/features/assets";
import { assetsApi } from "@shared/features/assets";

export type {
  CopyAssetRequest,
  CopyAssetResult,
  CreateAssetRequest,
  CreateAssetResult,
} from "@shared/features/assets";

const assetsClient = createFeatureClient(assetsApi);

export const createAsset = (req: CreateAssetRequest): Promise<CreateAssetResult> =>
  assetsClient.commands.create(req);

export const copyAsset = (req: CopyAssetRequest): Promise<CopyAssetResult> =>
  assetsClient.commands.copy(req);

export function convertFileSrc(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }

  return `file://${path}`;
}
