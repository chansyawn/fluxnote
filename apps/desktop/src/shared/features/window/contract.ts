import { z } from "zod";

const voidSchema = z.undefined();

export const windowCloseRequestedPayloadSchema = z.null();
export type WindowCloseRequestedPayload = z.infer<typeof windowCloseRequestedPayloadSchema>;

export const windowFocusChangedPayloadSchema = z.boolean();
export type WindowFocusChangedPayload = z.infer<typeof windowFocusChangedPayloadSchema>;

export const windowContract = {
  commands: {
    "window.destroy": {
      input: voidSchema,
      output: voidSchema,
    },
    "window.hide": {
      input: voidSchema,
      output: voidSchema,
    },
    "window.restart": {
      input: voidSchema,
      output: voidSchema,
    },
    "window.toggle": {
      input: voidSchema,
      output: voidSchema,
    },
  },
  events: {
    "window.close-requested": windowCloseRequestedPayloadSchema,
    "window.focus-changed": windowFocusChangedPayloadSchema,
  },
} as const;
