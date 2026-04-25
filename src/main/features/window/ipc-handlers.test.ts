import { createWindowCommandHandlers } from "@main/features/window/ipc-handlers";
import { describe, expect, it, vi } from "vite-plus/test";

function invokeHandler(handler: ReturnType<typeof createWindowCommandHandlers>[number]): void {
  void handler.handle(undefined as never, {} as never);
}

describe("window ipc handlers", () => {
  it("routes window commands through window manager services", () => {
    const services = {
      hideMainWindow: vi.fn(),
      requestQuit: vi.fn(),
      toggleMainWindow: vi.fn(),
    };
    const handlers = createWindowCommandHandlers(services);

    invokeHandler(handlers[0]);
    invokeHandler(handlers[1]);
    invokeHandler(handlers[2]);

    expect(services.hideMainWindow).toHaveBeenCalledTimes(1);
    expect(services.toggleMainWindow).toHaveBeenCalledTimes(1);
    expect(services.requestQuit).toHaveBeenCalledTimes(1);
  });
});
