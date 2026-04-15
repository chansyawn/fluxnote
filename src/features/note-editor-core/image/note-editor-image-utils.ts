import { createAsset, resolveAsset } from "@/clients";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const ASSET_URL_PREFIX = "assets://";

export function isSupportedImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type);
}

export function isInternalAssetUrl(src: string): boolean {
  return src.startsWith(ASSET_URL_PREFIX);
}

export async function createAssetFromFile(file: File, blockId: string) {
  const dataBase64 = await fileToBase64(file);

  return await createAsset({
    blockId,
    mimeType: file.type,
    fileName: file.name,
    dataBase64,
  });
}

export async function resolveAssetUrl(src: string, blockId: string): Promise<string> {
  if (!isInternalAssetUrl(src)) {
    return src;
  }

  const { convertFileSrc } = await import("@tauri-apps/api/core");
  const { resolvedPath } = await resolveAsset({ blockId, assetUrl: src });

  return convertFileSrc(resolvedPath);
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
