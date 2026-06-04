import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "@fluxnotes/editor";

type PlaygroundAssetInput = Parameters<BlockEditorRuntime["assets"]["create"]>[0]["assets"][number];

interface PlaygroundAssetRecord {
  altText: string;
  assetUrl: string;
  fileUrl: string;
}

const PLAYGROUND_SAMPLE_ASSET_URL = "assets://block/photo.png";

const PLAYGROUND_SAMPLE_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  <rect width="640" height="240" fill="#dddddd"/>
  <text x="320" y="132" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="48" font-weight="600" fill="#999999">Local image</text>
</svg>
`)}`;

const PLAYGROUND_SAMPLE_ASSET: PlaygroundAssetRecord = {
  altText: "Asset image",
  assetUrl: PLAYGROUND_SAMPLE_ASSET_URL,
  fileUrl: PLAYGROUND_SAMPLE_IMAGE_URL,
};

function base64ToBlob(input: PlaygroundAssetInput): Blob {
  const bytes = Uint8Array.from(atob(input.dataBase64), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: input.mimeType });
}

async function writeClipboardText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable.");
  }

  await navigator.clipboard.writeText(text);
}

async function writeClipboardData(data: BlockEditorClipboardWriteData): Promise<void> {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    const item = new ClipboardItem({
      "text/html": new Blob([data.html], { type: "text/html" }),
      "text/plain": new Blob([data.text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  await writeClipboardText(data.text);
}

export function createPlaygroundBlockEditorRuntime(): BlockEditorRuntime {
  const assets = new Map<string, PlaygroundAssetRecord>([
    [PLAYGROUND_SAMPLE_ASSET.assetUrl, PLAYGROUND_SAMPLE_ASSET],
  ]);

  return {
    assets: {
      copy: async ({ assetUrls }) => ({
        assets: assetUrls.map((sourceAssetUrl) => ({
          assetUrl: sourceAssetUrl,
          sourceAssetUrl,
        })),
      }),
      create: async ({ assets: inputs }) => {
        const createdAssets = inputs.map((input) => {
          const assetId = crypto.randomUUID();
          const assetUrl = `assets://playground/${assetId}`;
          const fileUrl = URL.createObjectURL(base64ToBlob(input));
          const altText = input.fileName ?? "Playground asset";

          assets.set(assetUrl, { altText, assetUrl, fileUrl });

          return { altText, assetUrl };
        });

        return { assets: createdAssets };
      },
      importFiles: async ({ files }) => ({
        assets: files.map(({ fileUrl }) => {
          const existingAsset = Array.from(assets.values()).find(
            (asset) => asset.fileUrl === fileUrl,
          );

          if (existingAsset) {
            return {
              altText: existingAsset.altText,
              assetUrl: existingAsset.assetUrl,
              fileUrl,
            };
          }

          return {
            error: "The browser playground can only import assets created in this session.",
            fileUrl,
          };
        }),
      }),
      renderAssetUrls: async (assetUrls) =>
        assetUrls
          .map((assetUrl) => assets.get(assetUrl))
          .filter((asset): asset is PlaygroundAssetRecord => asset !== undefined)
          .map(({ assetUrl, fileUrl }) => ({ assetUrl, renderUrl: fileUrl })),
      resolve: async ({ assetUrls }) => ({
        assets: assetUrls
          .map((assetUrl) => assets.get(assetUrl))
          .filter((asset): asset is PlaygroundAssetRecord => asset !== undefined)
          .map(({ assetUrl, fileUrl }) => ({ assetUrl, fileUrl })),
      }),
    },
    clipboard: {
      write: writeClipboardData,
      writeText: writeClipboardText,
    },
    links: {
      openExternal: async (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
  };
}
