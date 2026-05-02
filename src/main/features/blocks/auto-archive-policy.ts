import type { AppDatabase } from "@main/core/database/database-client";
import { blocks, type BlockRecord } from "@main/core/database/database-schema";
import { DEFAULT_SETTINGS, type AutoArchiveSettings } from "@shared/features/preferences/settings";
import { and, isNull, lt } from "drizzle-orm";

export interface AutoArchiveEvaluationContext {
  cutoffIso: string | null;
  protectedBlockIds: ReadonlySet<string>;
}

export interface AutoArchiveEvaluationInput {
  now: Date;
  protectedBlockIds: ReadonlySet<string>;
  settings: AutoArchiveSettings;
}

export async function resolveAutoArchiveSettings(
  readAutoArchiveSettings: () => AutoArchiveSettings | Promise<AutoArchiveSettings>,
): Promise<AutoArchiveSettings> {
  try {
    return await readAutoArchiveSettings();
  } catch {
    return DEFAULT_SETTINGS.autoArchive;
  }
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
      protectedBlockIds: normalizedProtectedBlockIds,
    };
  }

  return {
    cutoffIso: new Date(now.getTime() - settings.idleMinutes * 60_000).toISOString(),
    protectedBlockIds: normalizedProtectedBlockIds,
  };
}

export function blockWillAutoArchive(
  block: Pick<BlockRecord, "archivedAt" | "contentUpdatedAt" | "id">,
  context: AutoArchiveEvaluationContext,
): boolean {
  return (
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
  if (context.cutoffIso === null) {
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
