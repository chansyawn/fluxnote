import { z } from "zod";

const voidSchema = z.undefined();

export const cliIpcCommandContracts = {
  cliInstall: {
    channel: "fluxnotes:cli:install",
    request: voidSchema,
    response: voidSchema,
  },
  cliStatus: {
    channel: "fluxnotes:cli:status",
    request: voidSchema,
    response: z.object({
      installed: z.boolean(),
    }),
  },
  cliUninstall: {
    channel: "fluxnotes:cli:uninstall",
    request: voidSchema,
    response: voidSchema,
  },
} as const;
