import { createAsset, resolveAsset } from "@/clients";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const ASSET_URL_PREFIX = "assets://";
const IMAGE_DATA_URL_CACHE_LIMIT = 24;

interface CachedImagePayload {
  blob: Blob;
  dataUrl: string;
}

export interface ImageClipboardPayload {
  blob: Blob;
  dataUrl: string;
  mimeType: string;
}

const imagePayloadCache = new Map<string, CachedImagePayload>();
const imagePayloadPromiseCache = new Map<string, Promise<CachedImagePayload | null>>();

function getImageCacheKey(src: string, blockId: string): string {
  return `${blockId}:${src}`;
}

function setCachedImagePayload(cacheKey: string, payload: CachedImagePayload): void {
  if (imagePayloadCache.has(cacheKey)) {
    imagePayloadCache.delete(cacheKey);
  }

  imagePayloadCache.set(cacheKey, payload);

  if (imagePayloadCache.size <= IMAGE_DATA_URL_CACHE_LIMIT) {
    return;
  }

  const oldestCacheKey = imagePayloadCache.keys().next().value;
  if (oldestCacheKey) {
    imagePayloadCache.delete(oldestCacheKey);
  }
}

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

export function getCachedImageDataUrl(src: string, blockId: string): string | null {
  return imagePayloadCache.get(getImageCacheKey(src, blockId))?.dataUrl ?? null;
}

export async function loadImageClipboardPayload(
  src: string,
  blockId: string,
): Promise<ImageClipboardPayload | null> {
  const payload = await loadImagePayload(src, blockId);
  if (!payload) {
    return null;
  }

  return {
    blob: payload.blob,
    dataUrl: payload.dataUrl,
    mimeType: payload.blob.type,
  };
}

export async function convertAssetToDataUrl(src: string, blockId: string): Promise<string | null> {
  const payload = await loadImagePayload(src, blockId);
  if (!payload) {
    return null;
  }

  return payload.dataUrl;
}

export function warmImageDataUrlCache(src: string, blockId: string): void {
  if (!isInternalAssetUrl(src) || imagePayloadCache.has(getImageCacheKey(src, blockId))) {
    return;
  }

  void loadImagePayload(src, blockId);
}

async function loadImagePayload(src: string, blockId: string): Promise<CachedImagePayload | null> {
  const cacheKey = getImageCacheKey(src, blockId);
  const cachedPayload = imagePayloadCache.get(cacheKey);
  if (cachedPayload) {
    return cachedPayload;
  }

  const pendingPayload = imagePayloadPromiseCache.get(cacheKey);
  if (pendingPayload) {
    return await pendingPayload;
  }

  const payloadTask = (async () => {
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
      const dataUrl = await blobToDataUrl(blob);
      const payload = { blob, dataUrl };

      setCachedImagePayload(cacheKey, payload);
      return payload;
    } catch (error) {
      console.error("Failed to convert to data URL:", error);
      return null;
    } finally {
      imagePayloadPromiseCache.delete(cacheKey);
    }
  })();

  imagePayloadPromiseCache.set(cacheKey, payloadTask);

  return await payloadTask;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image blob as data URL"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image blob"));
    };

    reader.readAsDataURL(blob);
  });
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
