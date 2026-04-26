import { businessError } from "@shared/ipc/errors";

export const assetUrlScheme = "assets://";

export function sanitizeFileName(fileName: string): string {
  return (
    fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 120) || "asset"
  );
}

export function extFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export function splitAssetUrl(assetUrl: string): { blockId: string; fileName: string } {
  if (!assetUrl.startsWith(assetUrlScheme)) {
    throw businessError("BUSINESS.INVALID_INVOKE", "Invalid asset url", { assetUrl });
  }

  const suffix = assetUrl.slice(assetUrlScheme.length);
  const [blockId, ...fileNameParts] = suffix.split("/");
  const fileName = fileNameParts.join("/");
  if (!blockId || !fileName) {
    throw businessError("BUSINESS.INVALID_INVOKE", "Invalid asset url", { assetUrl });
  }

  return { blockId, fileName };
}
