import type { AppDatabase } from "@main/core/database";
import { blocks, type BlockRecord } from "@main/core/database";
import {
  DEFAULT_SETTINGS,
  type AutoArchiveSettings,
  type Settings,
} from "@shared/features/preferences/settings";
import { and, eq, isNull, lt } from "drizzle-orm";

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
  readSettings: () => Settings | Promise<Settings>,
): Promise<AutoArchiveSettings> {
  try {
    return (await readSettings()).autoArchive;
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
  block: Pick<BlockRecord, "archivedAt" | "contentUpdatedAt" | "id" | "isKept" | "isPinned">,
  context: AutoArchiveEvaluationContext,
): boolean {
  return (
    context.cutoffIso !== null &&
    block.archivedAt === null &&
    !block.isKept &&
    !block.isPinned &&
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
    .where(
      and(
        isNull(blocks.archivedAt),
        eq(blocks.isKept, false),
        eq(blocks.isPinned, false),
        lt(blocks.contentUpdatedAt, context.cutoffIso),
      ),
    )
    .all();

  return rows
    .map((row: { id: string }) => row.id)
    .filter((blockId) => !context.protectedBlockIds.has(blockId));
}

export function fingerprintAutoArchiveCandidateBlockIds(blockIds: readonly string[]): string {
  return [...blockIds].sort((left, right) => left.localeCompare(right)).join("\u0000");
}
