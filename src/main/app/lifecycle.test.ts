import { describe, expect, it } from "vite-plus/test";

import { createAppLifecycle } from "./lifecycle";

describe("app lifecycle", () => {
  it("keeps normal macOS window closes in the tray", () => {
    const lifecycle = createAppLifecycle({ platform: "darwin" });

    expect(lifecycle.shouldQuitWhenAllWindowsClosed()).toBe(false);
  });

  it("quits when an app update install closes all windows on macOS", () => {
    const lifecycle = createAppLifecycle({ platform: "darwin" });

    lifecycle.prepareToQuit("app-update-install");

    expect(lifecycle.shouldQuitWhenAllWindowsClosed()).toBe(true);
  });
});
