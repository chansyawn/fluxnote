import { ipcCommandKeys } from "@shared/ipc/contracts";
import type { WebContents } from "electron";

import type { AnyBackendCommandDefinition } from "../core/ipc/backend-feature";
import { defineIpcCommand } from "../core/ipc/define-ipc-command";
import { createBackendFeatureManifests } from "./feature-manifests";
import type { RegisterIpcCommandsOptions } from "./ipc-command-services";

export type { RegisterIpcCommandsOptions } from "./ipc-command-services";

interface DuplicateCommandKeyEntry {
  count: number;
  key: string;
}

export function collectIpcCommandDefinitions(
  options: RegisterIpcCommandsOptions,
): readonly AnyBackendCommandDefinition[] {
  return createBackendFeatureManifests(options).flatMap((feature) => feature.commands);
}

function findDuplicateCommandKeys(
  definitions: readonly AnyBackendCommandDefinition[],
): DuplicateCommandKeyEntry[] {
  const counts = new Map<string, number>();
  for (const definition of definitions) {
    const key = definition.contract.key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ count, key }));
}

export function assertIpcCommandCoverage(
  definitions: readonly AnyBackendCommandDefinition[],
): void {
  const duplicateEntries = findDuplicateCommandKeys(definitions);
  if (duplicateEntries.length > 0) {
    const summary = duplicateEntries.map((entry) => `${entry.key} (${entry.count})`).join(", ");
    throw new Error(`Duplicate IPC commands found: ${summary}`);
  }

  const registeredKeys = new Set(definitions.map((definition) => definition.contract.key));
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

function registerIpcCommandDefinition(
  definition: AnyBackendCommandDefinition,
  getTrustedWebContents: () => WebContents | null,
): void {
  defineIpcCommand({
    command: definition.contract,
    getTrustedWebContents,
    run: definition.handle,
  });
}
