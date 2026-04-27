import { z } from "zod";

const voidSchema = z.undefined();

export const preferencesIpcCommandContracts = {
  preferencesRead: {
    channel: "fluxnote:preferences:read",
    request: voidSchema,
    response: z.record(z.string(), z.unknown()),
  },
  preferencesWrite: {
    channel: "fluxnote:preferences:write",
    request: z.record(z.string(), z.unknown()),
    response: voidSchema,
  },
} as const;
