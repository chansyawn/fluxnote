import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  fetchFavicon: vi.fn(),
  openExternal: vi.fn(),
}));

vi.mock("electron", () => ({
  shell: {
    openExternal: mocks.openExternal,
  },
}));

vi.mock("./favicon", () => ({
  fetchFavicon: mocks.fetchFavicon,
}));

import { registerExternalUrlCommands } from "./command";

type CommandHandler = (input: { url: string }) => Promise<unknown>;

function registerHandlers() {
  const handlers = new Map<string, CommandHandler>();
  const ipc = {
    command: vi.fn((name: string, handler: CommandHandler) => handlers.set(name, handler)),
  };
  registerExternalUrlCommands(ipc as never);
  return handlers;
}

describe("external url command", () => {
  it("opens external urls", async () => {
    const handlers = registerHandlers();

    await handlers.get("external-url.open")?.({ url: "https://example.com" });

    expect(mocks.openExternal).toHaveBeenCalledWith("https://example.com");
  });

  it("fetches the favicon for a url", async () => {
    mocks.fetchFavicon.mockResolvedValue("data:image/png;base64,FAVICON");
    const handlers = registerHandlers();

    const result = await handlers.get("external-url.fetch-favicon")?.({
      url: "https://example.com",
    });

    expect(mocks.fetchFavicon).toHaveBeenCalledWith("https://example.com");
    expect(result).toEqual({ faviconDataUrl: "data:image/png;base64,FAVICON" });
  });
});
