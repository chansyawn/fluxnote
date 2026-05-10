import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FluxCliCommand } from "./args";
import {
  executeAddFromAuto,
  executeAddFromFile,
  executeAddFromText,
  executeCliCommand,
  executeExternalEdit,
  executeOpen,
} from "./executor";

function createFileStat(isFile: boolean) {
  return {
    isFile: () => isFile,
  };
}

function createDeps() {
  return {
    access: vi.fn(async () => undefined),
    cwd: vi.fn(() => "/workspace"),
    dispatchCommand: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(async () => createFileStat(true)),
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

  it("adds a block from text", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-1" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromText("hello", deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "hello",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-1");
  });

  it("adds a block from file", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("file-content");
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-2" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromFile("note.md", deps);

    expect(deps.access).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.stat).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.readFile).toHaveBeenCalledWith("/workspace/note.md", "utf8");
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "file-content",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-2");
  });

  it("rejects directories for explicit file input", async () => {
    const deps = createDeps();
    deps.stat.mockResolvedValue(createFileStat(false));

    await expect(executeAddFromFile("notes", deps)).rejects.toThrow("Expected a file path: notes");
    expect(deps.readFile).not.toHaveBeenCalled();
  });

  it("adds a block from auto input when input is an existing file", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("file-content");
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-3" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("note.md", deps);

    expect(deps.stat).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.readFile).toHaveBeenCalledWith("/workspace/note.md", "utf8");
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "file-content",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-3");
  });

  it("adds a block from auto input as text when input is not a file", async () => {
    const deps = createDeps();
    deps.stat.mockResolvedValue(createFileStat(false));
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-4" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("hello", deps);

    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "hello",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-4");
  });

  it("adds a block from auto input as text when stat fails", async () => {
    const deps = createDeps();
    deps.stat.mockRejectedValue(new Error("missing"));
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-5" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("hello", deps);

    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "hello",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-5");
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

    await expect(executeExternalEdit("note.md", deps)).rejects.toThrow("failed");
    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "original", "utf8");
  });

  it("routes add file command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("text-from-file");
    deps.dispatchCommand.mockResolvedValueOnce({ blockId: "block-6" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const command: FluxCliCommand = {
      kind: "add",
      source: {
        filePath: "note.md",
        type: "file",
      },
    };

    await executeCliCommand(command, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "text-from-file",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-6");
  });

  it("routes add text command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-7" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const command: FluxCliCommand = {
      kind: "add",
      source: {
        text: "inline",
        type: "text",
      },
    };

    await executeCliCommand(command, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "inline",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-7");
  });

  it("routes add auto command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.stat.mockResolvedValue(createFileStat(false));
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-8" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const command: FluxCliCommand = {
      kind: "add",
      source: {
        input: "inline",
        type: "auto",
      },
    };

    await executeCliCommand(command, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      content: "inline",
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-8");
  });

  it("routes edit command through executeCliCommand", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockResolvedValue({ status: "submitted", content: "updated" });

    await executeCliCommand({ filePath: "note.md", kind: "edit" }, deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-external-edit", {
      content: "original",
    });
    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "updated", "utf8");
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
