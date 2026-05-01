import type { AppContext } from "@main/core/context";
import type { CommandInput, CommandName, CommandOutput } from "@shared/ipc/types";
import { describe, expect, it, vi } from "vite-plus/test";

import { registerWindowCommands } from "./command";

type CommandHandler<T extends CommandName> = (
  input: CommandInput<T>,
  ctx: AppContext,
) => Promise<CommandOutput<T>> | CommandOutput<T>;

function createHandlers() {
  const handlers = new Map<CommandName, CommandHandler<CommandName>>();
  registerWindowCommands({
    command<T extends CommandName>(name: T, handler: CommandHandler<T>) {
      handlers.set(name, handler as CommandHandler<CommandName>);
    },
    register() {},
  } as never);
  return handlers;
}

describe("window ipc commands", () => {
  it("routes window commands through window manager services", async () => {
    const services = {
      hideMainWindow: vi.fn(),
      requestQuit: vi.fn(),
      toggleMainWindow: vi.fn(),
    };

    const ctx = {
      windowManager: {
        createMainWindow: vi.fn(),
        getMainWindow: vi.fn(() => null),
        hideMainWindow: services.hideMainWindow,
        openMainWindowDevTools: vi.fn(),
        prepareToQuit: vi.fn(),
        requestQuit: services.requestQuit,
        showMainWindow: vi.fn(),
        toggleMainWindow: services.toggleMainWindow,
      },
    } as unknown as AppContext;

    const handlers = createHandlers();
    await handlers.get("window.hide")?.(undefined, ctx);
    await handlers.get("window.toggle")?.(undefined, ctx);
    await handlers.get("window.destroy")?.(undefined, ctx);

    expect(services.hideMainWindow).toHaveBeenCalledTimes(1);
    expect(services.toggleMainWindow).toHaveBeenCalledTimes(1);
    expect(services.requestQuit).toHaveBeenCalledTimes(1);
  });
});
