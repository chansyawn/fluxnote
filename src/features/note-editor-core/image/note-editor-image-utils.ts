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

export async function convertAssetToDataUrl(src: string, blockId: string): Promise<string | null> {
  try {
    let url: string;

    if (isInternalAssetUrl(src)) {
      url = await resolveAssetUrl(src, blockId);
    } else {
      url = src;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return `data:${blob.type};base64,${base64}`;
  } catch (error) {
    console.error("Failed to convert to data URL:", error);
    return null;
  }
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
