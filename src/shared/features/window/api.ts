import { command, defineFeatureApi, event } from "@shared/ipc/feature-api";
import { z } from "zod";

const voidSchema = z.undefined();

export const windowCloseRequestedPayloadSchema = z.null();
export type WindowCloseRequestedPayload = z.infer<typeof windowCloseRequestedPayloadSchema>;

export const windowFocusChangedPayloadSchema = z.boolean();
export type WindowFocusChangedPayload = z.infer<typeof windowFocusChangedPayloadSchema>;

export const windowApi = defineFeatureApi({
  commands: {
    destroy: command({
      request: voidSchema,
      response: voidSchema,
    }),
    hide: command({
      request: voidSchema,
      response: voidSchema,
    }),
    toggle: command({
      request: voidSchema,
      response: voidSchema,
    }),
  },
  events: {
    closeRequested: event({
      payload: windowCloseRequestedPayloadSchema,
    }),
    focusChanged: event({
      payload: windowFocusChangedPayloadSchema,
    }),
  },
  name: "window",
});
