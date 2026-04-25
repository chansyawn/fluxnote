import os from "node:os";
import path from "node:path";

import type { IpcErrorPayload } from "@shared/ipc/errors";
import { z } from "zod";

import { backendCommandKeySchema } from "./backend-command-contracts";
import type { BackendCommandKey } from "./backend-command-contracts";

export const cliIpcRequestModeSchema = z.enum(["return-immediately", "wait"]);
export type CliIpcRequestMode = z.infer<typeof cliIpcRequestModeSchema>;

export const cliIpcRequestEnvelopeSchema = z.object({
  id: z.string().min(1),
  command: backendCommandKeySchema,
  mode: cliIpcRequestModeSchema.default("return-immediately"),
  payload: z.unknown(),
});

export type CliIpcRequestEnvelope = z.infer<typeof cliIpcRequestEnvelopeSchema>;

const cliIpcErrorPayloadSchema = z.object({
  details: z.unknown().optional(),
  message: z.string(),
  type: z.string(),
});

export const cliIpcResponseEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    data: z.unknown(),
    id: z.string(),
    ok: z.literal(true),
  }),
  z.object({
    error: cliIpcErrorPayloadSchema,
    id: z.string(),
    ok: z.literal(false),
  }),
]);

export type CliIpcResponseEnvelope =
  | {
      data: unknown;
      id: string;
      ok: true;
    }
  | {
      error: IpcErrorPayload;
      id: string;
      ok: false;
    };

function sanitizePipeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-") || "user";
}

export function resolveCliIpcSocketPath(): string {
  const userId =
    typeof process.getuid === "function"
      ? String(process.getuid())
      : sanitizePipeSegment(os.userInfo().username);

  if (process.platform === "win32") {
    return `\\\\.\\pipe\\fluxnote-${sanitizePipeSegment(userId)}`;
  }

  return path.join(os.tmpdir(), `fluxnote-${sanitizePipeSegment(userId)}.sock`);
}

export function createCliIpcRequest(
  command: BackendCommandKey,
  payload: unknown,
): CliIpcRequestEnvelope {
  return {
    command,
    id: crypto.randomUUID(),
    mode: "return-immediately",
    payload,
  };
}
