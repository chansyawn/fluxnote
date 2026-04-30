import type { AppDatabase } from "@main/core/database/database-client";
import { blocks, type BlockRecord } from "@main/core/database/database-schema";
import type { AutoArchiveSettings } from "@shared/features/preferences";
import { and, isNull, lt } from "drizzle-orm";

export interface AutoArchiveEvaluationContext {
  cutoffIso: string | null;
  enabled: boolean;
  protectedBlockIds: ReadonlySet<string>;
}

export interface AutoArchiveEvaluationInput {
  now: Date;
  protectedBlockIds: ReadonlySet<string>;
  settings: AutoArchiveSettings;
}

export function createAutoArchiveEvaluationContext({
  now,
  protectedBlockIds,
  settings,
}: AutoArchiveEvaluationInput): AutoArchiveEvaluationContext {
  const normalizedProtectedBlockIds = new Set(protectedBlockIds);

  if (!settings.enabled) {
    return {
      cutoffIso: null,
      enabled: false,
      protectedBlockIds: normalizedProtectedBlockIds,
    };
  }

  return {
    cutoffIso: new Date(now.getTime() - settings.idleMinutes * 60_000).toISOString(),
    enabled: true,
    protectedBlockIds: normalizedProtectedBlockIds,
  };
}

export function blockWillAutoArchive(
  block: Pick<BlockRecord, "archivedAt" | "contentUpdatedAt" | "id">,
  context: AutoArchiveEvaluationContext,
): boolean {
  return (
    context.enabled &&
    context.cutoffIso !== null &&
    block.archivedAt === null &&
    block.contentUpdatedAt < context.cutoffIso &&
    !context.protectedBlockIds.has(block.id)
  );
}

export async function listAutoArchiveCandidateBlockIds(
  db: AppDatabase,
  context: AutoArchiveEvaluationContext,
): Promise<string[]> {
  if (!context.enabled || context.cutoffIso === null) {
    return [];
  }

  const rows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(isNull(blocks.archivedAt), lt(blocks.contentUpdatedAt, context.cutoffIso)))
    .all();

  return rows
    .map((row: { id: string }) => row.id)
    .filter((blockId) => !context.protectedBlockIds.has(blockId));
}

export function fingerprintAutoArchiveCandidateBlockIds(blockIds: readonly string[]): string {
  return [...blockIds].sort((left, right) => left.localeCompare(right)).join("\u0000");
}
