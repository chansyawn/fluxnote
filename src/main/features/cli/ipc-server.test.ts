import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  let connectionHandler: ((socket: FakeSocket) => void) | null = null;

  class FakeSocket {
    destroyed = false;
    endedData = "";
    closeHandler: (() => void) | null = null;
    dataHandler: ((chunk: string) => void) | null = null;
    once(event: string, handler: () => void) {
      if (event === "close") this.closeHandler = handler;
      return this;
    }
    setEncoding() {}
    on(event: string, handler: (chunk: string) => void) {
      if (event === "data") this.dataHandler = handler;
      return this;
    }
    end(text: string) {
      this.endedData = text;
      this.destroyed = true;
    }
    emitData(text: string) {
      this.dataHandler?.(text);
    }
  }

  const server = {
    listening: false,
    once: vi.fn((_event: string, _handler: (error: Error) => void) => server),
    off: vi.fn((_event: string, _handler: (error: Error) => void) => server),
    listen: vi.fn((_socketPath: string, callback: () => void) => {
      server.listening = true;
      callback();
      return server;
    }),
    close: vi.fn((callback: (error?: Error) => void) => {
      server.listening = false;
      callback();
      return server;
    }),
  };

  return {
    FakeSocket,
    createServer: vi.fn((handler: (socket: FakeSocket) => void) => {
      connectionHandler = handler;
      return server;
    }),
    fsRm: vi.fn(async () => undefined),
    getConnectionHandler: () => connectionHandler,
    resolvePath: vi.fn(() => "/tmp/flux-test.sock"),
  };
});

vi.mock("node:fs/promises", () => ({ default: { rm: mocks.fsRm } }));
vi.mock("node:net", () => ({
  default: { createServer: mocks.createServer },
  createServer: mocks.createServer,
}));
vi.mock("@shared/features/cli/cli-transport", async () => {
  const actual = await vi.importActual("@shared/features/cli/cli-transport");
  return {
    ...actual,
    resolveCliIpcSocketPath: mocks.resolvePath,
  };
});

import { createCliIpcServer } from "./ipc-server";

describe("cli ipc server", () => {
  beforeEach(() => {
    mocks.fsRm.mockClear();
    mocks.createServer.mockClear();
    mocks.resolvePath.mockClear();
  });

  it("starts, handles one request line, and closes", async () => {
    const dispatchCommand = vi.fn(async () => ({ data: { ok: 1 }, ok: true as const }));
    const server = createCliIpcServer({
      dispatchCommand,
    });

    await server.start();

    const handler = mocks.getConnectionHandler();
    expect(handler).toBeTypeOf("function");
    const socket = new mocks.FakeSocket();
    handler?.(socket);
    socket.emitData(
      `${JSON.stringify({ id: "id-1", kind: "command", command: "app.open", payload: null, meta: { source: "cli" } })}\n`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(socket.endedData).toContain('"ok":true');

    await server.close();
    expect(mocks.fsRm).toHaveBeenCalled();
  });
});
