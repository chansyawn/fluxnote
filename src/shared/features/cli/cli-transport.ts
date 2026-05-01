import os from "node:os";
import path from "node:path";

import type { IpcErrorPayload } from "@shared/ipc/result";
import { z } from "zod";

import { backendCommandKeySchema, type BackendCommandKey } from "../entrypoints/commands";
import { createEntrypointEnvelope, createEntrypointEnvelopeSchema } from "../entrypoints/envelope";

export const cliEntrypointEnvelopeSchema = createEntrypointEnvelopeSchema(backendCommandKeySchema);

export type CliEntrypointEnvelope = z.infer<typeof cliEntrypointEnvelopeSchema>;

const cliIpcErrorPayloadSchema = z.object({
  details: z.unknown().optional(),
  message: z.string(),
  code: z.string(),
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
    return `\\\\.\\pipe\\fluxnotes-${sanitizePipeSegment(userId)}`;
  }

  return path.join(os.tmpdir(), `fluxnotes-${sanitizePipeSegment(userId)}.sock`);
}

export function createCliEntrypointEnvelope(
  command: BackendCommandKey,
  payload: unknown,
): CliEntrypointEnvelope {
  return createEntrypointEnvelope({
    command,
    payload,
    source: "cli",
  });
}
