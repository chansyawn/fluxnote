import { createWindowFeature } from "@main/features/window/feature";
import { describe, expect, it, vi } from "vite-plus/test";

type WindowCommand = ReturnType<typeof createWindowFeature>["commands"][number];

function invokeHandler(command: WindowCommand): void {
  void command.handle(undefined as never, {} as never);
}

describe("window ipc commands", () => {
  it("routes window commands through window manager services", () => {
    const services = {
      hideMainWindow: vi.fn(),
      requestQuit: vi.fn(),
      toggleMainWindow: vi.fn(),
    };
    const commands = createWindowFeature(services).commands;

    invokeHandler(commands[0]);
    invokeHandler(commands[1]);
    invokeHandler(commands[2]);

    expect(services.hideMainWindow).toHaveBeenCalledTimes(1);
    expect(services.toggleMainWindow).toHaveBeenCalledTimes(1);
    expect(services.requestQuit).toHaveBeenCalledTimes(1);
  });
});
