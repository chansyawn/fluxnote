import type { ImagePayload } from "../models/image";
import type { BlockEditorRuntime } from "../runtime/types";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export interface CreateImagePayloadsFromFilesInput {
  createAssets: BlockEditorRuntime["assets"]["create"];
  files: ReadonlyArray<File>;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }

  return btoa(chunks.join(""));
}

export function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType);
}

export function isSupportedImageFile(file: File): boolean {
  return isSupportedImageMimeType(file.type);
}

export function hasSupportedImageData(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  if (
    Array.from(dataTransfer.items).some(
      (item) => item.kind === "file" && isSupportedImageMimeType(item.type),
    )
  ) {
    return true;
  }

  return Array.from(dataTransfer.files).some(isSupportedImageFile);
}

export function getSupportedImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return [];
  }

  return Array.from(dataTransfer.files).filter(isSupportedImageFile);
}

export async function createImagePayloadsFromFiles({
  createAssets,
  files,
}: CreateImagePayloadsFromFilesInput): Promise<ImagePayload[]> {
  const supportedFiles = files.filter(isSupportedImageFile);
  if (supportedFiles.length === 0) {
    return [];
  }

  const assets = await Promise.all(
    supportedFiles.map(async (file) => ({
      dataBase64: arrayBufferToBase64(await file.arrayBuffer()),
      fileName: file.name || undefined,
      mimeType: file.type,
    })),
  );
  const result = await createAssets({ assets });

  return result.assets.map((asset) => ({
    alt: asset.altText,
    src: asset.assetUrl,
    title: null,
  }));
}
