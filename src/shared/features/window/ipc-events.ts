import { z } from "zod";

export const windowCloseRequestedPayloadSchema = z.null();
export type WindowCloseRequestedPayload = z.infer<typeof windowCloseRequestedPayloadSchema>;

export const windowFocusChangedPayloadSchema = z.boolean();
export type WindowFocusChangedPayload = z.infer<typeof windowFocusChangedPayloadSchema>;

export const windowIpcEventContracts = {
  windowCloseRequested: {
    channel: "fluxnotes:event:window://close-requested",
    payload: windowCloseRequestedPayloadSchema,
  },
  windowFocusChanged: {
    channel: "fluxnotes:event:window://focus-changed",
    payload: windowFocusChangedPayloadSchema,
  },
} as const;
