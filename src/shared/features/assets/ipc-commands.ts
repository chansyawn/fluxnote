import { z } from "zod";

export const assetsIpcCommandContracts = {
  assetsCopy: {
    channel: "fluxnote:assets:copy",
    request: z.object({
      sourceBlockId: z.string().min(1),
      targetBlockId: z.string().min(1),
      assetUrl: z.string().min(1),
    }),
    response: z.object({ assetUrl: z.string() }),
  },
  assetsCreate: {
    channel: "fluxnote:assets:create",
    request: z.object({
      blockId: z.string().min(1),
      mimeType: z.string().min(1),
      fileName: z.string().optional(),
      dataBase64: z.string().min(1),
    }),
    response: z.object({
      assetUrl: z.string(),
      altText: z.string(),
    }),
  },
} as const;
