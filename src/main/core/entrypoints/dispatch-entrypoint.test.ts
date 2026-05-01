import { createEntrypointDispatcher } from "@main/core/entrypoints/dispatch-entrypoint";
import type {
  BackendCommandKey,
  BackendCommandResponse,
  ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import { businessError } from "@shared/ipc/result";
import { describe, expect, it, vi } from "vite-plus/test";

describe("entrypoint dispatcher", () => {
  it("returns BUSINESS.INVALID_INVOKE when request validation fails", async () => {
    const dispatcher = createEntrypointDispatcher({
      executeCommand: vi.fn(),
    });

    const result = await dispatcher.dispatchCommand("block.open", { bad: "input" });

    expect(result).toMatchObject({
      error: {
        code: "BUSINESS.INVALID_INVOKE",
      },
      ok: false,
    });
  });

  it("passes through business errors", async () => {
    const dispatcher = createEntrypointDispatcher({
      executeCommand: vi.fn(async () => {
        throw businessError("BUSINESS.NOT_FOUND", "not found", { id: "x" });
      }),
    });

    const result = await dispatcher.dispatchCommand("block.open", { blockId: "x" });

    expect(result).toEqual({
      error: {
        code: "BUSINESS.NOT_FOUND",
        details: { id: "x" },
        message: "not found",
      },
      ok: false,
    });
  });

  it("maps unknown errors to INTERNAL", async () => {
    const dispatcher = createEntrypointDispatcher({
      executeCommand: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    const result = await dispatcher.dispatchCommand("app.open", null);

    expect(result).toMatchObject({
      error: {
        code: "INTERNAL",
        message: "boom",
      },
      ok: false,
    });
  });

  it("returns typed success data", async () => {
    const executeCommand = async <TKey extends BackendCommandKey>(
      _command: TKey,
      _request: ParsedBackendCommandRequest<TKey>,
    ): Promise<BackendCommandResponse<TKey>> => {
      return null as BackendCommandResponse<TKey>;
    };
    const dispatcher = createEntrypointDispatcher({
      executeCommand,
    });

    const result = await dispatcher.dispatchCommand("app.open", null);

    expect(result).toEqual({
      data: null,
      ok: true,
    });
  });
});
