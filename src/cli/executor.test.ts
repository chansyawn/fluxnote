import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FluxCliCommand } from "./args";
import {
  executeCliCommand,
  executeCreateFromFile,
  executeCreateFromText,
  executeExternalEdit,
  executeOpen,
} from "./executor";

function createDeps() {
  return {
    access: vi.fn(async () => undefined),
    cwd: vi.fn(() => "/workspace"),
    dispatchCommand: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
}

describe("executor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("executes open command", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue(null);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeOpen(deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("app.open", null);
    expect(logSpy).toHaveBeenCalledWith("Opened Fluxnotes.");
  });

  it("creates a block from text", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-1" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeCreateFromText("hello", deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "hello",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-1");
  });

  it("creates a block from file", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("file-content");
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-2" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeCreateFromFile("note.md", deps);

    expect(deps.access).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.readFile).toHaveBeenCalledWith("/workspace/note.md", "utf8");
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "file-content",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-2");
  });

  it("writes updated content on external edit submit", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockResolvedValue({ status: "submitted", content: "updated" });

    await executeExternalEdit("note.md", deps);

    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "updated", "utf8");
  });

  it("does not write file when external edit is canceled", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockResolvedValue({ status: "canceled" });

    await executeExternalEdit("note.md", deps);

    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it("rolls back file content when external edit fails", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockRejectedValue(new Error("failed"));
    deps.writeFile.mockResolvedValue(undefined);

    await expect(executeExternalEdit("note.md", deps)).rejects.toThrowError("failed");
    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "original", "utf8");
  });

  it("routes parsed command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("text-from-file");
    deps.dispatchCommand.mockResolvedValueOnce({ blockId: "block-3" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const command: FluxCliCommand = {
      kind: "create",
      edit: false,
      source: {
        filePath: "note.md",
        type: "file",
      },
    };

    await executeCliCommand(command, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "text-from-file",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-3");
  });

  it("routes text command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-4" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const command: FluxCliCommand = {
      kind: "create",
      edit: false,
      source: {
        text: "inline",
        type: "text",
      },
    };

    await executeCliCommand(command, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "inline",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-4");
  });

  it("routes open command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue(null);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeCliCommand({ kind: "open" }, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("app.open", null);
    expect(logSpy).toHaveBeenCalledWith("Opened Fluxnotes.");
  });

  it("returns without side effects for help command", async () => {
    const deps = createDeps();

    await executeCliCommand({ kind: "help" }, deps);

    expect(deps.dispatchCommand).not.toHaveBeenCalled();
    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });
});
