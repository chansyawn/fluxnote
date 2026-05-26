import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  executeAddFromAuto,
  executeAddFromFile,
  executeAddFromText,
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

    await executeAddFromText("hello", [], deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_text",
      content: "hello",
      tagNames: [],
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-1");
  });

  it("adds a block from text with tags", async () => {
    const deps = createDeps();
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-1" });

    await executeAddFromText("hello", ["work", "idea"], deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_text",
      content: "hello",
      tagNames: ["work", "idea"],
    });
  });

  it("adds a block from file", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("file-content");
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-2" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromFile("note.md", ["draft"], deps);

    expect(deps.access).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.stat).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.readFile).toHaveBeenCalledWith("/workspace/note.md", "utf8");
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_file",
      content: "file-content",
      tagNames: ["draft"],
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-2");
  });

  it("rejects directories for explicit file input", async () => {
    const deps = createDeps();
    deps.stat.mockResolvedValue(createFileStat(false));

    await expect(executeAddFromFile("notes", [], deps)).rejects.toThrow(
      "Expected a file path: notes",
    );
    expect(deps.readFile).not.toHaveBeenCalled();
  });

  it("adds a block from auto input when input is an existing file", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("file-content");
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-3" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("note.md", ["file-tag"], deps);

    expect(deps.stat).toHaveBeenCalledWith("/workspace/note.md");
    expect(deps.readFile).toHaveBeenCalledWith("/workspace/note.md", "utf8");
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_file",
      content: "file-content",
      tagNames: ["file-tag"],
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-3");
  });

  it("adds a block from auto input as text when input is not a file", async () => {
    const deps = createDeps();
    deps.stat.mockResolvedValue(createFileStat(false));
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-4" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("hello", ["text-tag"], deps);

    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_text",
      content: "hello",
      tagNames: ["text-tag"],
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-4");
  });

  it("adds a block from auto input as text when stat fails", async () => {
    const deps = createDeps();
    deps.stat.mockRejectedValue(new Error("missing"));
    deps.dispatchCommand.mockResolvedValue({ blockId: "block-5" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await executeAddFromAuto("hello", [], deps);

    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-from-text", {
      blockCreatedSource: "cli_add_text",
      content: "hello",
      tagNames: [],
    });
    expect(logSpy).toHaveBeenCalledWith("Created block: block-5");
  });

  it("writes updated content on external edit submit", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockResolvedValue({ status: "submitted", content: "updated" });

    await executeExternalEdit("note.md", ["work"], deps);

    expect(deps.dispatchCommand).toHaveBeenCalledWith("block.create-external-edit", {
      content: "original",
      tagNames: ["work"],
      trigger: {
        cwd: "/workspace",
        requestedFilePath: "note.md",
        source: "cli",
        targetFilePath: "/workspace/note.md",
      },
    });
    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "updated", "utf8");
  });

  it("does not write file when external edit is canceled", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockResolvedValue({ status: "cancelled" });

    await executeExternalEdit("note.md", [], deps);

    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it("rolls back file content when external edit fails", async () => {
    const deps = createDeps();
    deps.readFile.mockResolvedValue("original");
    deps.dispatchCommand.mockRejectedValue(new Error("failed"));
    deps.writeFile.mockResolvedValue(undefined);

    await expect(executeExternalEdit("note.md", [], deps)).rejects.toThrow("failed");
    expect(deps.writeFile).toHaveBeenCalledWith("/workspace/note.md", "original", "utf8");
  });
});
