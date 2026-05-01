import { z } from "zod";

const entrypointSourceSchema = z.enum(["cli", "deep-link"]);
const entrypointKindSchema = z.literal("command");

export type EntrypointSource = z.infer<typeof entrypointSourceSchema>;
export type EntrypointKind = z.infer<typeof entrypointKindSchema>;

export const entrypointMetaSchema = z.object({
  source: entrypointSourceSchema,
  timestamp: z.number().int().nonnegative().optional(),
});

export function createEntrypointEnvelopeSchema<TCommand extends z.ZodTypeAny>(
  commandSchema: TCommand,
) {
  return z.object({
    id: z.string().min(1),
    kind: entrypointKindSchema,
    command: commandSchema,
    payload: z.unknown(),
    meta: entrypointMetaSchema,
  });
}

interface CreateEntrypointEnvelopeInput<TCommand extends string, TPayload> {
  command: TCommand;
  payload: TPayload;
  source: EntrypointSource;
  timestamp?: number;
}

export function createEntrypointEnvelope<TCommand extends string, TPayload>(
  input: CreateEntrypointEnvelopeInput<TCommand, TPayload>,
): EntrypointEnvelope<TCommand, TPayload> {
  return {
    command: input.command,
    id: crypto.randomUUID(),
    kind: "command",
    meta: {
      source: input.source,
      timestamp: input.timestamp ?? Date.now(),
    },
    payload: input.payload,
  };
}

export type EntrypointEnvelope<TCommand extends string = string, TPayload = unknown> = {
  id: string;
  kind: EntrypointKind;
  command: TCommand;
  payload: TPayload;
  meta: {
    source: EntrypointSource;
    timestamp?: number;
  };
};
