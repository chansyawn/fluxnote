import { createSampleCommandHandlers } from "@main/features/sample/ipc-handlers";
import { describe, expect, it } from "vite-plus/test";

function getSampleGreetHandler() {
  const handlers = createSampleCommandHandlers();
  const handler = handlers.find((item) => item.key === "sampleGreet");
  if (!handler) {
    throw new Error("sampleGreet handler is missing");
  }
  return handler;
}

describe("sample ipc handlers", () => {
  it("returns greeting message for normal names", async () => {
    const handler = getSampleGreetHandler();

    await expect(handler.handle({ name: "FluxNote" }, {} as never)).resolves.toEqual({
      message: "Hello, FluxNote! This message is from the Electron backend.",
    });
  });

  it("throws BUSINESS.NOT_FOUND for missing placeholder name", async () => {
    const handler = getSampleGreetHandler();

    await expect(handler.handle({ name: "missing" }, {} as never)).rejects.toMatchObject({
      type: "BUSINESS.NOT_FOUND",
      message: "Resource not found: missing",
    });
  });
});
