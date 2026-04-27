import { z } from "zod";

const voidSchema = z.undefined();

export const cliIpcCommandContracts = {
  cliInstall: {
    channel: "fluxnote:cli:install",
    request: voidSchema,
    response: voidSchema,
  },
  cliStatus: {
    channel: "fluxnote:cli:status",
    request: voidSchema,
    response: z.object({
      installed: z.boolean(),
    }),
  },
  cliUninstall: {
    channel: "fluxnote:cli:uninstall",
    request: voidSchema,
    response: voidSchema,
  },
} as const;
