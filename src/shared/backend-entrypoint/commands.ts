import { z } from "zod";

import { externalEditResultSchema } from "../features/external-edit/session-contracts";

export const backendCommandKeys = [
  "app.open",
  "block.createExternalEdit",
  "block.createFromText",
  "block.open",
] as const;
export type BackendCommandKey = (typeof backendCommandKeys)[number];

const nullSchema = z.null();

export const backendCommandContracts = {
  "app.open": {
    request: nullSchema,
    response: nullSchema,
  },
  "block.createFromText": {
    request: z.object({
      content: z.string(),
    }),
    response: z.object({
      blockId: z.string().min(1),
    }),
  },
  "block.createExternalEdit": {
    request: z.object({
      content: z.string(),
    }),
    response: externalEditResultSchema,
  },
  "block.open": {
    request: z.object({
      blockId: z.string().min(1),
    }),
    response: nullSchema,
  },
} as const;

export type BackendCommandContract<TKey extends BackendCommandKey = BackendCommandKey> =
  (typeof backendCommandContracts)[TKey];
export type BackendCommandRequest<TKey extends BackendCommandKey> = z.input<
  BackendCommandContract<TKey>["request"]
>;
export type ParsedBackendCommandRequest<TKey extends BackendCommandKey> = z.infer<
  BackendCommandContract<TKey>["request"]
>;
export type BackendCommandResponse<TKey extends BackendCommandKey> = z.infer<
  BackendCommandContract<TKey>["response"]
>;

export const backendCommandKeySchema = z.enum(backendCommandKeys);
