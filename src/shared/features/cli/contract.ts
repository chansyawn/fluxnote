import { z } from "zod";

const voidSchema = z.undefined();

export const cliContract = {
  commands: {
    "cli.install": {
      input: voidSchema,
      output: voidSchema,
    },
    "cli.status": {
      input: voidSchema,
      output: z.object({
        installed: z.boolean(),
      }),
    },
    "cli.uninstall": {
      input: voidSchema,
      output: voidSchema,
    },
  },
  events: {},
} as const;
