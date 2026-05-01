import { z } from "zod";

import { externalEditResultSchema } from "../external-edit/session-contracts";

export const backendCommandKeys = [
  "app.open",
  "block.create-external-edit",
  "block.create-from-text",
  "block.open",
] as const;
export type BackendCommandKey = (typeof backendCommandKeys)[number];

const nullSchema = z.null();

export const backendCommandContracts = {
  "app.open": {
    request: nullSchema,
    response: nullSchema,
  },
  "block.create-from-text": {
    request: z.object({
      content: z.string(),
    }),
    response: z.object({
      blockId: z.string().min(1),
    }),
  },
  "block.create-external-edit": {
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
