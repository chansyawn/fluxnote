import { z } from "zod";

export const sampleIpcCommandContracts = {
  sampleGreet: {
    channel: "fluxnote:sample:greet",
    request: z.object({
      name: z.string().trim().min(1).max(20),
    }),
    response: z.object({ message: z.string() }),
  },
} as const;
