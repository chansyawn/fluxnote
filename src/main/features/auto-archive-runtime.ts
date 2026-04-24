import fs from "node:fs/promises";

import type { AutoArchiveStateChangedPayload } from "@shared/ipc/contracts";
import { and, inArray, isNull, lt } from "drizzle-orm";

import type { BackendStore } from "./backend-store";
import type { AppDatabase } from "./database/database-client";
import { blocks } from "./database/database-schema";
import type { EmitIpcEvent } from "./ipc/emit-ipc-event";

interface AutoArchiveConfig {
  enabled: boolean;
  idleMinutes: number;
  scanIntervalSeconds: number;
}

interface AutoArchiveRuntimeOptions {
  emitEvent: EmitIpcEvent;
  getWindowVisible: () => boolean;
  settingsFilePath: string;
  store: BackendStore;
}

const DEFAULT_CONFIG: AutoArchiveConfig = {
  enabled: true,
  idleMinutes: 7 * 24 * 60,
  scanIntervalSeconds: 300,
};
const MIN_SCAN_INTERVAL_SECONDS = 30;

export class AutoArchiveRuntime {
  private readonly emitEvent: EmitIpcEvent;
  private readonly getWindowVisible: AutoArchiveRuntimeOptions["getWindowVisible"];
  private readonly settingsFilePath: string;
  private readonly store: BackendStore;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private lastPayload: AutoArchiveStateChangedPayload | null = null;

  constructor(options: AutoArchiveRuntimeOptions) {
    this.emitEvent = options.emitEvent;
    this.getWindowVisible = options.getWindowVisible;
    this.settingsFilePath = options.settingsFilePath;
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
    const delayMs = Math.max(config.scanIntervalSeconds, MIN_SCAN_INTERVAL_SECONDS) * 1000;
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
    const cutoffTime = new Date(now.getTime() - config.idleMinutes * 60_000).toISOString();
    const db = this.store.getDb();

    if (!config.enabled) {
      this.emitIfChanged({
        archivedCount: 0,
        pendingCount: 0,
        windowVisible,
      });
      return;
    }

    const staleBlockIds = listStaleActiveBlockIds(db, cutoffTime);
    let archivedCount = 0;
    if (forceArchiveWhenHidden && !windowVisible && staleBlockIds.length > 0) {
      archivedCount = archiveBlocks(db, staleBlockIds, now.toISOString());
    }

    this.emitIfChanged({
      archivedCount,
      pendingCount: staleBlockIds.length,
      windowVisible,
    });
  }

  private emitIfChanged(payload: AutoArchiveStateChangedPayload): void {
    const last = this.lastPayload;
    const changed =
      !last ||
      last.archivedCount !== payload.archivedCount ||
      last.pendingCount !== payload.pendingCount ||
      last.windowVisible !== payload.windowVisible;
    if (!changed) {
      return;
    }

    this.lastPayload = payload;
    this.emitEvent("autoArchiveStateChanged", payload);
  }

  private async readConfig(): Promise<AutoArchiveConfig> {
    try {
      const content = await fs.readFile(this.settingsFilePath, "utf8");
      const parsed = JSON.parse(content) as {
        autoArchive?: Partial<AutoArchiveConfig>;
      };
      const fromFile = parsed.autoArchive ?? {};

      return {
        enabled: typeof fromFile.enabled === "boolean" ? fromFile.enabled : DEFAULT_CONFIG.enabled,
        idleMinutes:
          typeof fromFile.idleMinutes === "number" && fromFile.idleMinutes > 0
            ? fromFile.idleMinutes
            : DEFAULT_CONFIG.idleMinutes,
        scanIntervalSeconds:
          typeof fromFile.scanIntervalSeconds === "number" && fromFile.scanIntervalSeconds > 0
            ? fromFile.scanIntervalSeconds
            : DEFAULT_CONFIG.scanIntervalSeconds,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
}

function listStaleActiveBlockIds(db: AppDatabase, cutoffIso: string): string[] {
  return db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(isNull(blocks.archivedAt), lt(blocks.updatedAt, cutoffIso)))
    .all()
    .map((row) => row.id);
}

function archiveBlocks(db: AppDatabase, blockIds: readonly string[], archivedAt: string): number {
  if (blockIds.length === 0) {
    return 0;
  }

  const result = db
    .update(blocks)
    .set({
      archivedAt,
      updatedAt: archivedAt,
    })
    .where(and(isNull(blocks.archivedAt), inArray(blocks.id, [...blockIds])))
    .run();
  return result.changes;
}
