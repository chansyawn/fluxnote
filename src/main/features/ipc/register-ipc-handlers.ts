import { ipcCommandContracts, ipcCommandKeys, type IpcCommandKey } from "@shared/ipc/contracts";
import type { BrowserWindow, WebContents } from "electron";

import { createAssetsCommandHandlers } from "../assets/ipc-handlers";
import type { BackendStore } from "../backend-store";
import { createBlocksCommandHandlers } from "../blocks/ipc-handlers";
import type { AppDatabase } from "../database/database-client";
import type { PendingDeepLink } from "../deep-link/deep-link-handler";
import { createDeepLinkCommandHandlers } from "../deep-link/ipc-handlers";
import { createPreferencesCommandHandlers } from "../preferences/ipc-handlers";
import { createSampleCommandHandlers } from "../sample/ipc-handlers";
import { createShortcutCommandHandlers } from "../shortcut/ipc-handlers";
import { createTagsCommandHandlers } from "../tags/ipc-handlers";
import { createWindowCommandHandlers } from "../window/ipc-handlers";
import { defineIpcHandler } from "./define-ipc-handler";
import type { EmitIpcEvent } from "./emit-ipc-event";
import type {
  AnyIpcCommandHandlerDefinition,
  IpcCommandHandlerDefinition,
} from "./ipc-handler-definition";

export interface RegisterIpcHandlersOptions {
  acknowledgePendingDeepLink: (blockId: string) => void;
  emitEvent: EmitIpcEvent;
  getMainWindow: () => BrowserWindow | null;
  hideMainWindow: () => void;
  readPendingDeepLink: () => PendingDeepLink;
  readPreferences: () => Record<string, unknown>;
  requestQuit: () => void;
  store: BackendStore;
  toggleMainWindow: () => void;
  writePreferences: (value: Record<string, unknown>) => void;
}

interface DuplicateCommandKeyEntry {
  count: number;
  key: IpcCommandKey;
}

async function getDb(options: RegisterIpcHandlersOptions): Promise<AppDatabase> {
  await options.store.init();
  return options.store.getDb();
}

export function collectIpcCommandHandlerDefinitions(
  options: RegisterIpcHandlersOptions,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    ...createSampleCommandHandlers(),
    ...createBlocksCommandHandlers({
      getDb: async () => await getDb(options),
      store: options.store,
    }),
    ...createTagsCommandHandlers({
      getDb: async () => await getDb(options),
    }),
    ...createAssetsCommandHandlers({
      getDb: async () => await getDb(options),
      store: options.store,
    }),
    ...createDeepLinkCommandHandlers({
      acknowledgePending: options.acknowledgePendingDeepLink,
      readPending: options.readPendingDeepLink,
    }),
    ...createWindowCommandHandlers({
      hideMainWindow: options.hideMainWindow,
      requestQuit: options.requestQuit,
      toggleMainWindow: options.toggleMainWindow,
    }),
    ...createShortcutCommandHandlers({
      emitEvent: options.emitEvent,
    }),
    ...createPreferencesCommandHandlers({
      readPreferences: options.readPreferences,
      writePreferences: options.writePreferences,
    }),
  ];
}

function findDuplicateCommandKeys(
  definitions: readonly AnyIpcCommandHandlerDefinition[],
): DuplicateCommandKeyEntry[] {
  const counts = new Map<IpcCommandKey, number>();
  for (const definition of definitions) {
    counts.set(definition.key, (counts.get(definition.key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ count, key }));
}

export function assertIpcCommandHandlerCoverage(
  definitions: readonly AnyIpcCommandHandlerDefinition[],
): void {
  const duplicateEntries = findDuplicateCommandKeys(definitions);
  if (duplicateEntries.length > 0) {
    const summary = duplicateEntries.map((entry) => `${entry.key} (${entry.count})`).join(", ");
    throw new Error(`Duplicate IPC command handlers found: ${summary}`);
  }

  const registeredKeys = new Set(definitions.map((definition) => definition.key));
  const missingKeys = ipcCommandKeys.filter((key) => !registeredKeys.has(key));
  if (missingKeys.length > 0) {
    throw new Error(`Missing IPC command handlers for keys: ${missingKeys.join(", ")}`);
  }
}

export function registerIpcHandlers(options: RegisterIpcHandlersOptions): void {
  const getTrustedWebContents = () => options.getMainWindow()?.webContents ?? null;
  const definitions = collectIpcCommandHandlerDefinitions(options);
  assertIpcCommandHandlerCoverage(definitions);

  for (const definition of definitions) {
    registerIpcHandlerDefinition(definition, getTrustedWebContents);
  }
}

function registerIpcHandlerDefinition<TKey extends IpcCommandKey>(
  definition: IpcCommandHandlerDefinition<TKey>,
  getTrustedWebContents: () => WebContents | null,
): void {
  defineIpcHandler({
    command: ipcCommandContracts[definition.key],
    getTrustedWebContents,
    handler: definition.handle,
  });
}
