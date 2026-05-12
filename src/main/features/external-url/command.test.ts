import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn(),
}));

vi.mock("electron", () => ({
  shell: {
    openExternal: mocks.openExternal,
  },
}));

import { registerExternalUrlCommands } from "./command";

describe("external url command", () => {
  it("opens external urls", async () => {
    const handlers = new Map<string, (input: { url: string }) => Promise<void>>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: { url: string }) => Promise<void>) =>
        handlers.set(name, handler),
      ),
    };

    registerExternalUrlCommands(ipc as never);

    await handlers.get("external-url.open")?.({ url: "https://example.com" });

    expect(mocks.openExternal).toHaveBeenCalledWith("https://example.com");
  });
});
