import type { AppContext } from "@main/app-context";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn(),
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: electronMock.handle,
  },
}));

import { createIpcRouter } from "./create-ipc-router";

function createContext(trusted = true): AppContext {
  return {
    events: {
      emit: vi.fn(() => true),
      isSenderTrusted: vi.fn(() => trusted),
      registerWindow: vi.fn(),
    },
    externalEditManager: {
      begin: vi.fn(),
      cancelAll: vi.fn(),
      claim: vi.fn(),
      listSessions: vi.fn(() => []),
    } as AppContext["externalEditManager"],
    getDb: vi.fn(),
    now: () => new Date(),
    openBlockService: {
      acknowledgePending: vi.fn(),
      emitPending: vi.fn(() => true),
      readPending: vi.fn(() => ({ blockId: null })),
      requestOpen: vi.fn(() => true),
    },
    preferencesService: {
      patchSettings: vi.fn(),
      readAutoArchiveSettings: vi.fn(),
      readSettings: vi.fn(),
      resetSettings: vi.fn(),
    } as AppContext["preferencesService"],
    store: {
      getAssetPathForBlock: vi.fn(),
      getDb: vi.fn(),
      init: vi.fn(),
    } as unknown as AppContext["store"],
    windowManager: {
      createMainWindow: vi.fn(),
      getMainWindow: vi.fn(() => null),
      hideMainWindow: vi.fn(),
      openMainWindowDevTools: vi.fn(),
      prepareToQuit: vi.fn(),
      requestQuit: vi.fn(),
      showMainWindow: vi.fn(),
      toggleMainWindow: vi.fn(),
    },
  };
}

describe("createIpcRouter", () => {
  beforeEach(() => {
    electronMock.handle.mockClear();
  });

  it("parses input and output for registered commands", async () => {
    const ctx = createContext(true);
    const router = createIpcRouter(ctx);

    router.command("window.destroy", () => undefined);
    router.register();

    const handler = electronMock.handle.mock.calls[0]?.[1] as (
      event: { sender: unknown },
      payload: unknown,
    ) => Promise<unknown>;
    const result = await handler({ sender: {} }, undefined);

    expect(result).toEqual({
      ok: true,
      data: undefined,
    });
  });

  it("rejects untrusted senders", async () => {
    const ctx = createContext(false);
    const router = createIpcRouter(ctx);

    router.command("window.destroy", () => undefined);
    router.register();

    const handler = electronMock.handle.mock.calls[0]?.[1] as (
      event: { sender: unknown },
      payload: unknown,
    ) => Promise<{ ok: boolean; error?: { code: string } }>;
    const result = await handler({ sender: {} }, undefined);

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "BUSINESS.INVALID_INVOKE" }),
      }),
    );
  });
});
