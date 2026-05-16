import { z } from "zod";

const voidSchema = z.undefined();
const cliStatusSchema = z.object({
  canInstall: z.boolean(),
  canUninstall: z.boolean(),
  commandName: z.literal("flux"),
  installed: z.boolean(),
  installPath: z.string().nullable(),
  managedBy: z.enum(["manual-link", "user-path-shim", "unsupported"]),
  targetPath: z.string().nullable(),
});

export const cliContract = {
  commands: {
    "cli.install": {
      input: voidSchema,
      output: voidSchema,
    },
    "cli.status": {
      input: voidSchema,
      output: cliStatusSchema,
    },
    "cli.uninstall": {
      input: voidSchema,
      output: voidSchema,
    },
  },
  events: {},
} as const;
