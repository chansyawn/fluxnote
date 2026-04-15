import { invoke } from "@/app/invoke";

export interface CreateAssetRequest {
  blockId: string;
  mimeType: string;
  fileName?: string;
  dataBase64: string;
}

export interface CreateAssetResult {
  assetUrl: string;
  altText: string;
}

export interface ResolveAssetRequest {
  blockId: string;
  assetUrl: string;
}

export interface ResolveAssetResult {
  resolvedPath: string;
}

export async function createAsset(req: CreateAssetRequest): Promise<CreateAssetResult> {
  return await invoke<CreateAssetResult>("assets_create", { ...req });
}

export async function resolveAsset(req: ResolveAssetRequest): Promise<ResolveAssetResult> {
  return await invoke<ResolveAssetResult>("assets_resolve", { ...req });
}
