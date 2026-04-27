import {
  assertIpcCommandCoverage,
  collectIpcCommandDefinitions,
  type RegisterIpcCommandsOptions,
} from "@main/app/ipc-registry";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { describe, expect, it, vi } from "vite-plus/test";

function createOptions(): RegisterIpcCommandsOptions {
  return {
    acknowledgePendingOpenBlock: vi.fn(),
    emitEvent: vi.fn(() => true),
    externalEditManager: {
      cancelAll: vi.fn(),
      begin: vi.fn(),
      claim: vi.fn(),
      listSessions: vi.fn(() => []),
    },
    getMainWindow: () => null,
    hideMainWindow: vi.fn(),
    readPendingOpenBlock: () => ({ blockId: null }),
    readPreferences: () => ({}),
    requestQuit: vi.fn(),
    store: {
      getAssetPathForBlock: vi.fn(),
      getDb: vi.fn(),
      init: vi.fn(),
    } as unknown as BackendStore,
    toggleMainWindow: vi.fn(),
    writePreferences: vi.fn(),
  };
}

describe("register ipc commands", () => {
  it("collects a complete command definition set", () => {
    const definitions = collectIpcCommandDefinitions(createOptions());

    expect(() => assertIpcCommandCoverage(definitions)).not.toThrow();
  });

  it("throws when duplicate command keys are registered", () => {
    const definitions = collectIpcCommandDefinitions(createOptions());

    expect(() => assertIpcCommandCoverage([...definitions, definitions[0]])).toThrow(
      /Duplicate IPC commands/,
    );
  });

  it("throws when a command is missing", () => {
    const definitions = collectIpcCommandDefinitions(createOptions());

    expect(() => assertIpcCommandCoverage(definitions.slice(1))).toThrow(/Missing IPC commands/);
  });
});
