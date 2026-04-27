import { z } from "zod";

const voidSchema = z.undefined();

export const windowIpcCommandContracts = {
  windowDestroy: {
    channel: "fluxnote:window:destroy",
    request: voidSchema,
    response: voidSchema,
  },
  windowHide: {
    channel: "fluxnote:window:hide",
    request: voidSchema,
    response: voidSchema,
  },
  windowToggle: {
    channel: "fluxnote:window:toggle",
    request: voidSchema,
    response: voidSchema,
  },
} as const;
