import type { AppDatabase } from "@main/core/database";
import { blocks } from "@main/core/database";
import { getSqliteChangedRows } from "@main/core/database";
import type { EventBus } from "@main/core/ipc";
import type { PersistenceRuntime } from "@main/core/persistence";
import type { AutoArchiveStateChangedPayload } from "@shared/features/blocks/contract";
import type { AutoArchiveSettings } from "@shared/features/preferences/settings";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  createAutoArchiveEvaluationContext,
  fingerprintAutoArchiveCandidateBlockIds,
  listAutoArchiveCandidateBlockIds,
  resolveAutoArchiveSettings,
} from "./auto-archive-policy";

interface AutoArchiveRuntimeOptions {
  emitEvent: EventBus["emit"];
  getProtectedBlockIds?: () => Set<string>;
  getWindowVisible: () => boolean;
  persistence: PersistenceRuntime;
  readAutoArchiveSettings: () => AutoArchiveSettings | Promise<AutoArchiveSettings>;
}

export interface AutoArchiveRuntime {
  start: () => Promise<void>;
  stop: () => void;
  trigger: (forceArchiveWhenHidden: boolean) => Promise<void>;
}

const MIN_SCAN_INTERVAL_SECONDS = 30;
const MAX_SCAN_INTERVAL_SECONDS = 15 * 60;
const SCAN_INTERVAL_RATIO = 0.1;

export function deriveScanIntervalSeconds(idleMinutes: number): number {
  const derivedSeconds = Math.floor(idleMinutes * 60 * SCAN_INTERVAL_RATIO);
  return Math.min(Math.max(derivedSeconds, MIN_SCAN_INTERVAL_SECONDS), MAX_SCAN_INTERVAL_SECONDS);
}

export function createAutoArchiveRuntime(options: AutoArchiveRuntimeOptions): AutoArchiveRuntime {
  const getProtectedBlockIds = options.getProtectedBlockIds ?? (() => new Set<string>());
  let running = false;
  let timer: NodeJS.Timeout | null = null;
  let lastState: {
    candidateFingerprint: string;
    payload: AutoArchiveStateChangedPayload;
  } | null = null;

  function emitIfChanged(
    payload: AutoArchiveStateChangedPayload,
    candidateFingerprint: string,
  ): void {
    const changed =
      lastState === null ||
      lastState.payload.archivedCount !== payload.archivedCount ||
      lastState.payload.pendingCount !== payload.pendingCount ||
      lastState.payload.windowVisible !== payload.windowVisible ||
      lastState.candidateFingerprint !== candidateFingerprint;
    if (!changed) {
      return;
    }

    lastState = { candidateFingerprint, payload };
    options.emitEvent("blocks.auto-archive-state-changed", payload);
  }

  async function scan(forceArchiveWhenHidden: boolean): Promise<void> {
    const config = await resolveAutoArchiveSettings(options.readAutoArchiveSettings);
    const windowVisible = options.getWindowVisible();

    if (!config.enabled) {
      emitIfChanged(
        {
          archivedCount: 0,
          pendingCount: 0,
          windowVisible,
        },
        "",
      );
      return;
    }

    const now = new Date();
    const db = options.persistence.getDb();
    const evaluationContext = createAutoArchiveEvaluationContext({
      now,
      protectedBlockIds: getProtectedBlockIds(),
      settings: config,
    });
    const staleBlockIds = await listAutoArchiveCandidateBlockIds(db, evaluationContext);
    const shouldArchive = forceArchiveWhenHidden && !windowVisible && staleBlockIds.length > 0;

    if (!shouldArchive) {
      emitIfChanged(
        {
          archivedCount: 0,
          pendingCount: staleBlockIds.length,
          windowVisible,
        },
        fingerprintAutoArchiveCandidateBlockIds(staleBlockIds),
      );
      return;
    }

    const archivedCount = await archiveBlocks(db, staleBlockIds, now.toISOString());
    const remainingBlockIds = await listAutoArchiveCandidateBlockIds(db, evaluationContext);
    emitIfChanged(
      {
        archivedCount,
        pendingCount: remainingBlockIds.length,
        windowVisible,
      },
      fingerprintAutoArchiveCandidateBlockIds(remainingBlockIds),
    );
  }

  async function scheduleNextTick(): Promise<void> {
    if (!running) {
      return;
    }

    const config = await resolveAutoArchiveSettings(options.readAutoArchiveSettings);
    timer = setTimeout(
      () => {
        void (async () => {
          if (!running) {
            return;
          }

          try {
            await scan(false);
          } finally {
            await scheduleNextTick();
          }
        })();
      },
      deriveScanIntervalSeconds(config.idleMinutes) * 1000,
    );
  }

  async function start(): Promise<void> {
    if (running) {
      return;
    }

    running = true;
    await scan(false);
    await scheduleNextTick();
  }

  function stop(): void {
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function trigger(forceArchiveWhenHidden: boolean): Promise<void> {
    if (!running) {
      return;
    }

    await scan(forceArchiveWhenHidden);
  }

  return {
    start,
    stop,
    trigger,
  };
}

async function archiveBlocks(
  db: AppDatabase,
  blockIds: readonly string[],
  archivedAt: string,
): Promise<number> {
  if (blockIds.length === 0) {
    return 0;
  }

  const result = await db
    .update(blocks)
    .set({
      archivedAt,
    })
    .where(
      and(isNull(blocks.archivedAt), eq(blocks.isKept, false), inArray(blocks.id, [...blockIds])),
    )
    .run();
  return getSqliteChangedRows(result);
}
