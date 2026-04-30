import type { AppDatabase } from "@main/core/database/database-client";
import { blocks } from "@main/core/database/database-schema";
import { getSqliteChangedRows } from "@main/core/database/db-utils";
import type { EmitIpcEvent } from "@main/core/ipc/event-bus";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { blocksApi, type AutoArchiveStateChangedPayload } from "@shared/features/blocks";
import { DEFAULT_SETTINGS, type AutoArchiveSettings } from "@shared/features/preferences";
import { and, inArray, isNull } from "drizzle-orm";

import {
  createAutoArchiveEvaluationContext,
  fingerprintAutoArchiveCandidateBlockIds,
  listAutoArchiveCandidateBlockIds,
} from "./auto-archive-policy";

interface AutoArchiveRuntimeOptions {
  emitEvent: EmitIpcEvent;
  getProtectedBlockIds?: () => Set<string>;
  getWindowVisible: () => boolean;
  readAutoArchiveSettings: () => AutoArchiveSettings | Promise<AutoArchiveSettings>;
  store: BackendStore;
}

const MIN_SCAN_INTERVAL_SECONDS = 30;
const MAX_SCAN_INTERVAL_SECONDS = 15 * 60;
const SCAN_INTERVAL_RATIO = 0.1;

export function deriveScanIntervalSeconds(idleMinutes: number): number {
  const derivedSeconds = Math.floor(idleMinutes * 60 * SCAN_INTERVAL_RATIO);
  return Math.min(Math.max(derivedSeconds, MIN_SCAN_INTERVAL_SECONDS), MAX_SCAN_INTERVAL_SECONDS);
}

export class AutoArchiveRuntime {
  private readonly emitEvent: EmitIpcEvent;
  private readonly getProtectedBlockIds: () => Set<string>;
  private readonly getWindowVisible: AutoArchiveRuntimeOptions["getWindowVisible"];
  private readonly readAutoArchiveSettings: AutoArchiveRuntimeOptions["readAutoArchiveSettings"];
  private readonly store: BackendStore;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastPayload: AutoArchiveStateChangedPayload | null = null;
  private lastCandidateFingerprint: string | null = null;

  constructor(options: AutoArchiveRuntimeOptions) {
    this.emitEvent = options.emitEvent;
    this.getProtectedBlockIds = options.getProtectedBlockIds ?? (() => new Set());
    this.getWindowVisible = options.getWindowVisible;
    this.readAutoArchiveSettings = options.readAutoArchiveSettings;
    this.store = options.store;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    await this.scan(false);
    await this.scheduleNextTick();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async trigger(forceArchiveWhenHidden: boolean): Promise<void> {
    if (!this.running) {
      return;
    }

    await this.scan(forceArchiveWhenHidden);
  }

  private async scheduleNextTick(): Promise<void> {
    if (!this.running) {
      return;
    }

    const config = await this.readConfig();
    const delayMs = deriveScanIntervalSeconds(config.idleMinutes) * 1000;
    this.timer = setTimeout(async () => {
      if (!this.running) {
        return;
      }

      try {
        await this.scan(false);
      } finally {
        await this.scheduleNextTick();
      }
    }, delayMs);
  }

  private async scan(forceArchiveWhenHidden: boolean): Promise<void> {
    const config = await this.readConfig();
    const windowVisible = this.getWindowVisible();
    const now = new Date();
    const db = this.store.getDb();
    const evaluationContext = createAutoArchiveEvaluationContext({
      now,
      protectedBlockIds: this.getProtectedBlockIds(),
      settings: config,
    });

    if (!config.enabled) {
      this.emitIfChanged(
        {
          archivedCount: 0,
          pendingCount: 0,
          windowVisible,
        },
        "",
      );
      return;
    }

    const staleBlockIds = await listAutoArchiveCandidateBlockIds(db, evaluationContext);
    const candidateFingerprint = fingerprintAutoArchiveCandidateBlockIds(staleBlockIds);
    let archivedCount = 0;
    if (forceArchiveWhenHidden && !windowVisible && staleBlockIds.length > 0) {
      archivedCount = await archiveBlocks(db, staleBlockIds, now.toISOString());
    }

    this.emitIfChanged(
      {
        archivedCount,
        pendingCount: staleBlockIds.length,
        windowVisible,
      },
      candidateFingerprint,
    );
  }

  private emitIfChanged(
    payload: AutoArchiveStateChangedPayload,
    candidateFingerprint: string,
  ): void {
    const last = this.lastPayload;
    const changed =
      !last ||
      last.archivedCount !== payload.archivedCount ||
      last.pendingCount !== payload.pendingCount ||
      last.windowVisible !== payload.windowVisible ||
      this.lastCandidateFingerprint !== candidateFingerprint;
    if (!changed) {
      return;
    }

    this.lastPayload = payload;
    this.lastCandidateFingerprint = candidateFingerprint;
    this.emitEvent(blocksApi.events.autoArchiveStateChanged, payload);
  }

  private async readConfig(): Promise<AutoArchiveSettings> {
    try {
      return await this.readAutoArchiveSettings();
    } catch {
      return DEFAULT_SETTINGS.autoArchive;
    }
  }
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
    .where(and(isNull(blocks.archivedAt), inArray(blocks.id, [...blockIds])))
    .run();
  return getSqliteChangedRows(result);
}
