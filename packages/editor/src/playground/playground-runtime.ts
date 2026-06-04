import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "@fluxnotes/editor";

type PlaygroundAssetInput = Parameters<BlockEditorRuntime["assets"]["create"]>[0]["assets"][number];

interface PlaygroundAssetRecord {
  altText: string;
  assetUrl: string;
  fileUrl: string;
}

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
  const assets = new Map<string, PlaygroundAssetRecord>();

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
