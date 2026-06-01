import { z } from "zod";

export const assetsContract = {
  commands: {
    "assets.copy": {
      input: z.object({
        sourceBlockId: z.string().min(1),
        targetBlockId: z.string().min(1),
        assetUrls: z.array(z.string().min(1)),
      }),
      output: z.object({
        assets: z.array(
          z.object({
            sourceAssetUrl: z.string(),
            assetUrl: z.string(),
          }),
        ),
      }),
    },
    "assets.create": {
      input: z.object({
        blockId: z.string().min(1),
        assets: z.array(
          z.object({
            mimeType: z.string().min(1),
            fileName: z.string().optional(),
            dataBase64: z.string().min(1),
          }),
        ),
      }),
      output: z.object({
        assets: z.array(
          z.object({
            assetUrl: z.string(),
            altText: z.string(),
          }),
        ),
      }),
    },
    "assets.importFiles": {
      input: z.object({
        blockId: z.string().min(1),
        files: z.array(
          z.object({
            fileUrl: z.string().min(1),
          }),
        ),
      }),
      output: z.object({
        assets: z.array(
          z.object({
            fileUrl: z.string(),
            assetUrl: z.string().optional(),
            altText: z.string().optional(),
            error: z.string().optional(),
          }),
        ),
      }),
    },
    "assets.resolve": {
      input: z.object({
        assetUrls: z.array(z.string().min(1)),
      }),
      output: z.object({
        assets: z.array(
          z.object({
            assetUrl: z.string(),
            fileUrl: z.string(),
          }),
        ),
      }),
    },
  },
  events: {},
} as const;
