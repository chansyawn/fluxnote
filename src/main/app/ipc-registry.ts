import { ipcCommandContracts, ipcCommandKeys, type IpcCommandKey } from "@shared/ipc/contracts";
import type { WebContents } from "electron";

import { defineIpcCommand } from "../core/ipc/define-ipc-command";
import type {
  AnyIpcCommandDefinition,
  IpcCommandDefinition,
} from "../core/ipc/ipc-command-definition";
import { createBackendFeatureManifests } from "./feature-manifests";
import type { RegisterIpcCommandsOptions } from "./ipc-command-services";

export type { RegisterIpcCommandsOptions } from "./ipc-command-services";

interface DuplicateCommandKeyEntry {
  count: number;
  key: IpcCommandKey;
}

export function collectIpcCommandDefinitions(
  options: RegisterIpcCommandsOptions,
): readonly AnyIpcCommandDefinition[] {
  return createBackendFeatureManifests(options).flatMap((manifest) => manifest.ipcCommands ?? []);
}

function findDuplicateCommandKeys(
  definitions: readonly AnyIpcCommandDefinition[],
): DuplicateCommandKeyEntry[] {
  const counts = new Map<IpcCommandKey, number>();
  for (const definition of definitions) {
    counts.set(definition.key, (counts.get(definition.key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ count, key }));
}

export function assertIpcCommandCoverage(definitions: readonly AnyIpcCommandDefinition[]): void {
  const duplicateEntries = findDuplicateCommandKeys(definitions);
  if (duplicateEntries.length > 0) {
    const summary = duplicateEntries.map((entry) => `${entry.key} (${entry.count})`).join(", ");
    throw new Error(`Duplicate IPC commands found: ${summary}`);
  }

  const registeredKeys = new Set(definitions.map((definition) => definition.key));
  const missingKeys = ipcCommandKeys.filter((key) => !registeredKeys.has(key));
  if (missingKeys.length > 0) {
    throw new Error(`Missing IPC commands for keys: ${missingKeys.join(", ")}`);
  }
}

export function registerIpcCommands(options: RegisterIpcCommandsOptions): void {
  const getTrustedWebContents = () => options.getMainWindow()?.webContents ?? null;
  const definitions = collectIpcCommandDefinitions(options);
  assertIpcCommandCoverage(definitions);

  for (const definition of definitions) {
    registerIpcCommandDefinition(definition, getTrustedWebContents);
  }
}

function registerIpcCommandDefinition<TKey extends IpcCommandKey>(
  definition: IpcCommandDefinition<TKey>,
  getTrustedWebContents: () => WebContents | null,
): void {
  defineIpcCommand({
    command: ipcCommandContracts[definition.key],
    getTrustedWebContents,
    run: definition.handle,
  });
}
