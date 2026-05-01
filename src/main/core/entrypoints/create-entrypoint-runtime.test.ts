import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const executeMock = vi.fn();
const dispatchCommandMock = vi.fn();
const cliServerStartMock = vi.fn(async () => {});
const cliServerCloseMock = vi.fn(async () => {});
const handleDeepLinkMock = vi.fn(async (_urlText: string) => true);

vi.mock("./execute-entrypoint-command", () => ({
  createEntrypointCommandExecutor: vi.fn(() => ({
    execute: executeMock,
  })),
}));

vi.mock("./dispatch-entrypoint", () => ({
  createEntrypointDispatcher: vi.fn(() => ({
    dispatchCommand: dispatchCommandMock,
  })),
}));

vi.mock("../../features/cli/ipc-server", () => ({
  createCliIpcServer: vi.fn(() => ({
    close: cliServerCloseMock,
    start: cliServerStartMock,
  })),
}));

vi.mock("../../features/deep-link/handler", () => ({
  createDeepLinkHandler: vi.fn(() => ({
    handle: handleDeepLinkMock,
  })),
}));

import { createEntrypointRuntime } from "./create-entrypoint-runtime";

describe("createEntrypointRuntime", () => {
  beforeEach(() => {
    executeMock.mockReset();
    dispatchCommandMock.mockReset();
    cliServerStartMock.mockReset();
    cliServerCloseMock.mockReset();
    handleDeepLinkMock.mockReset();
    cliServerStartMock.mockResolvedValue(undefined);
    cliServerCloseMock.mockResolvedValue(undefined);
    handleDeepLinkMock.mockResolvedValue(true);
  });

  it("delegates command dispatch to shared dispatcher", async () => {
    dispatchCommandMock.mockResolvedValue({ data: null, ok: true });
    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb: vi.fn(),
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
    });

    const result = await runtime.dispatchCommand("app.open", null);

    expect(dispatchCommandMock).toHaveBeenCalledWith("app.open", null, undefined);
    expect(result).toEqual({ data: null, ok: true });
  });

  it("delegates deep-link handling and cli server lifecycle", async () => {
    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb: vi.fn(),
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
    });

    await runtime.startCliServer();
    await runtime.stopCliServer();
    await runtime.handleDeepLink("flux://app/open");

    expect(cliServerStartMock).toHaveBeenCalledTimes(1);
    expect(cliServerCloseMock).toHaveBeenCalledTimes(1);
    expect(handleDeepLinkMock).toHaveBeenCalledWith("flux://app/open");
  });
});
