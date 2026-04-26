import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { dispatchCommand } from "./cli-ipc-client";
import { runFluxCli } from "./index";

vi.mock("./cli-ipc-client", () => ({
  dispatchCommand: vi.fn(),
}));

const dispatchCommandMock = vi.mocked(dispatchCommand);
const baseArgv = ["node", "flux"];

describe("flux cli runtime", () => {
  let tempDir: string | null = null;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "flux-cli-test-"));
    dispatchCommandMock.mockReset();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
      tempDir = null;
    }
  });

  async function writeTempFile(content: string): Promise<string> {
    if (!tempDir) {
      throw new Error("Temp dir not initialized.");
    }

    const filePath = path.join(tempDir, "input.md");
    await writeFile(filePath, content, "utf8");
    return filePath;
  }

  it("writes submitted external edits back to the source file", async () => {
    const filePath = await writeTempFile("draft");
    dispatchCommandMock.mockResolvedValue({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });

    await expect(runFluxCli([...baseArgv, "--edit", filePath])).resolves.toBe(0);

    await expect(readFile(filePath, "utf8")).resolves.toBe("submitted");
    expect(dispatchCommandMock).toHaveBeenCalledWith("block.createExternalEdit", {
      content: "draft",
    });
  });

  it("restores the source file when external editing is cancelled", async () => {
    const filePath = await writeTempFile("draft");
    dispatchCommandMock.mockResolvedValue({
      blockId: "block-1",
      status: "cancelled",
    });

    await expect(runFluxCli([...baseArgv, "--file", filePath, "--edit"])).resolves.toBe(0);

    await expect(readFile(filePath, "utf8")).resolves.toBe("draft");
  });

  it("restores the source file when external editing fails", async () => {
    const filePath = await writeTempFile("draft");
    dispatchCommandMock.mockRejectedValue(new Error("Backend unavailable."));

    await expect(runFluxCli([...baseArgv, filePath, "--edit"])).rejects.toThrow(
      "Backend unavailable.",
    );
    await expect(readFile(filePath, "utf8")).resolves.toBe("draft");
  });
});
