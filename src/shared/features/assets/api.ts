import { command, defineFeatureApi } from "@shared/ipc/feature-api";
import { z } from "zod";

export const assetsApi = defineFeatureApi({
  commands: {
    copy: command({
      request: z.object({
        sourceBlockId: z.string().min(1),
        targetBlockId: z.string().min(1),
        assetUrl: z.string().min(1),
      }),
      response: z.object({ assetUrl: z.string() }),
    }),
    create: command({
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
    }),
  },
  name: "assets",
});
