import { z } from "zod";

const voidSchema = z.undefined();

export const externalUrlOpenRequestSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }),
});

export type ExternalUrlOpenRequest = z.infer<typeof externalUrlOpenRequestSchema>;

export const externalUrlContract = {
  commands: {
    "external-url.open": {
      input: externalUrlOpenRequestSchema,
      output: voidSchema,
    },
  },
  events: {},
} as const;
