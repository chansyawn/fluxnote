import { z } from "zod";

const voidSchema = z.undefined();

export const windowIpcCommandContracts = {
  windowDestroy: {
    channel: "fluxnotes:window:destroy",
    request: voidSchema,
    response: voidSchema,
  },
  windowHide: {
    channel: "fluxnotes:window:hide",
    request: voidSchema,
    response: voidSchema,
  },
  windowToggle: {
    channel: "fluxnotes:window:toggle",
    request: voidSchema,
    response: voidSchema,
  },
} as const;
