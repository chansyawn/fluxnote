import type { BackendStore } from "@main/features/backend-store";
import {
  assertIpcCommandHandlerCoverage,
  collectIpcCommandHandlerDefinitions,
  type RegisterIpcHandlersOptions,
} from "@main/features/ipc/register-ipc-handlers";
import { describe, expect, it, vi } from "vite-plus/test";

function createOptions(): RegisterIpcHandlersOptions {
  return {
    emitEvent: vi.fn(() => true),
    getMainWindow: () => null,
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

describe("register ipc handlers", () => {
  it("collects a complete handler definition set", () => {
    const definitions = collectIpcCommandHandlerDefinitions(createOptions());

    expect(() => assertIpcCommandHandlerCoverage(definitions)).not.toThrow();
  });

  it("throws when duplicate handler keys are registered", () => {
    const definitions = collectIpcCommandHandlerDefinitions(createOptions());

    expect(() => assertIpcCommandHandlerCoverage([...definitions, definitions[0]])).toThrow(
      /Duplicate IPC command handlers/,
    );
  });

  it("throws when a command handler is missing", () => {
    const definitions = collectIpcCommandHandlerDefinitions(createOptions());

    expect(() => assertIpcCommandHandlerCoverage(definitions.slice(1))).toThrow(
      /Missing IPC command handlers/,
    );
  });
});
