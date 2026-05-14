import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;

  class FakeSocket {
    private handlers = new Map<string, Handler[]>();
    written = "";

    setEncoding() {
      return this;
    }

    write(text: string) {
      this.written += text;
      return true;
    }

    end() {
      this.emit("end");
      return this;
    }

    once(event: string, handler: Handler) {
      const wrapped: Handler = (...args) => {
        this.off(event, wrapped);
        handler(...args);
      };
      return this.on(event, wrapped);
    }

    on(event: string, handler: Handler) {
      const list = this.handlers.get(event) ?? [];
      list.push(handler);
      this.handlers.set(event, list);
      return this;
    }

    private off(event: string, handler: Handler) {
      const list = this.handlers.get(event) ?? [];
      this.handlers.set(
        event,
        list.filter((item) => item !== handler),
      );
    }

    emit(event: string, ...args: unknown[]) {
      const list = this.handlers.get(event) ?? [];
      for (const handler of list) {
        handler(...args);
      }
    }
  }

  type ConnectionBehavior = (socket: FakeSocket, socketPath: string) => void;

  const queue: ConnectionBehavior[] = [];

  const createConnection = vi.fn((socketPath: string) => {
    const socket = new FakeSocket();
    const behavior = queue.shift();
    if (!behavior) {
      throw new Error("No mock behavior for createConnection.");
    }
    queueMicrotask(() => behavior(socket, socketPath));
    return socket;
  });

  const spawn = vi.fn(() => ({ unref: vi.fn() }));
  const stat = vi.fn();
  const access = vi.fn();

  function pushBehavior(behavior: ConnectionBehavior) {
    queue.push(behavior);
  }

  function connectionError(code: string): Error {
    const error = new Error(code) as NodeJS.ErrnoException;
    error.code = code;
    return error;
  }

  function connectAndRespond(socket: FakeSocket, data: unknown) {
    socket.emit("connect");
    const request = JSON.parse(socket.written.trim()) as { id: string };
    socket.emit(
      "data",
      `${JSON.stringify({
        data,
        id: request.id,
        ok: true,
      })}\n`,
    );
  }

  return {
    access,
    connectAndRespond,
    connectionError,
    createConnection,
    pushBehavior,
    spawn,
    stat,
  };
});

vi.mock("node:net", () => ({
  default: { createConnection: mocks.createConnection },
}));

vi.mock("node:child_process", () => ({
  spawn: mocks.spawn,
}));

vi.mock("node:fs/promises", () => ({
  access: mocks.access,
  stat: mocks.stat,
}));

import { dispatchCommand } from "./ipc-dispatcher";

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

describe("ipc-dispatcher", () => {
  beforeEach(() => {
    setPlatform("darwin");
    vi.clearAllMocks();
    delete process.env.ELECTRON_RUN_AS_NODE;
    mocks.access.mockResolvedValue(undefined);
    mocks.stat.mockResolvedValue({ isFile: () => true });
  });

  it("sends command directly when server is reachable", async () => {
    mocks.pushBehavior((socket) => {
      mocks.connectAndRespond(socket, null);
    });

    await expect(dispatchCommand("app.open", null)).resolves.toBeNull();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("retries after launching packaged macOS app on connection error", async () => {
    mocks.pushBehavior((socket) => {
      socket.emit("error", mocks.connectionError("ENOENT"));
    });
    mocks.pushBehavior((socket) => {
      socket.emit("connect");
    });
    mocks.pushBehavior((socket) => {
      mocks.connectAndRespond(socket, null);
    });

    await expect(dispatchCommand("app.open", null)).resolves.toBeNull();
    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    expect(mocks.spawn).toHaveBeenCalledWith("open", ["-a", expect.any(String)], {
      detached: true,
      env: expect.any(Object),
      stdio: "ignore",
    });
  });

  it("retries after launching packaged Windows app on connection error", async () => {
    setPlatform("win32");
    process.env.ELECTRON_RUN_AS_NODE = "1";
    mocks.pushBehavior((socket) => {
      socket.emit("error", mocks.connectionError("ENOENT"));
    });
    mocks.pushBehavior((socket) => {
      socket.emit("connect");
    });
    mocks.pushBehavior((socket) => {
      mocks.connectAndRespond(socket, null);
    });

    await expect(dispatchCommand("app.open", null)).resolves.toBeNull();
    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    expect(mocks.spawn).toHaveBeenCalledWith(expect.stringMatching(/fluxnotes\.exe$/), [], {
      detached: true,
      env: expect.not.objectContaining({ ELECTRON_RUN_AS_NODE: "1" }),
      stdio: "ignore",
    });
  });

  it("falls back to development app launch when packaged app is not found", async () => {
    mocks.stat.mockResolvedValue({ isFile: () => false });
    mocks.pushBehavior((socket) => {
      socket.emit("error", mocks.connectionError("ENOENT"));
    });
    mocks.pushBehavior((socket) => {
      socket.emit("connect");
    });
    mocks.pushBehavior((socket) => {
      mocks.connectAndRespond(socket, null);
    });

    await expect(dispatchCommand("app.open", null)).resolves.toBeNull();
    expect(mocks.spawn).toHaveBeenCalledWith("vp", ["run", "dev"], {
      cwd: expect.any(String),
      detached: true,
      env: expect.any(Object),
      stdio: "ignore",
    });
  });

  it("throws non-connection errors without launching app", async () => {
    mocks.pushBehavior((socket) => {
      socket.emit("error", mocks.connectionError("ETIMEDOUT"));
    });

    await expect(dispatchCommand("app.open", null)).rejects.toMatchObject({ code: "ETIMEDOUT" });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
});
