import { createSampleIpcCommands } from "@main/features/sample/ipc-commands";
import { describe, expect, it } from "vite-plus/test";

function getSampleGreetHandler() {
  const commands = createSampleIpcCommands();
  const command = commands.find((item) => item.key === "sampleGreet");
  if (!command) {
    throw new Error("sampleGreet command is missing");
  }
  return command;
}

describe("sample ipc commands", () => {
  it("returns greeting message for normal names", async () => {
    const command = getSampleGreetHandler();

    await expect(command.handle({ name: "FluxNote" }, {} as never)).resolves.toEqual({
      message: "Hello, FluxNote! This message is from the Electron backend.",
    });
  });

  it("throws BUSINESS.NOT_FOUND for missing placeholder name", async () => {
    const command = getSampleGreetHandler();

    await expect(command.handle({ name: "missing" }, {} as never)).rejects.toMatchObject({
      type: "BUSINESS.NOT_FOUND",
      message: "Resource not found: missing",
    });
  });
});
