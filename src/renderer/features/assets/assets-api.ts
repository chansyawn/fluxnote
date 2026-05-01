import { invokeCommand } from "@renderer/ipc-client";
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
  invokeCommand("assets.create", req);

export const copyAsset = (req: CopyAssetRequest): Promise<CopyAssetResult> =>
  invokeCommand("assets.copy", req);

export function convertFileSrc(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }

  return `file://${path}`;
}
