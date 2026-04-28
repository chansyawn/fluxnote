import { toElectronAccelerator } from "@renderer/features/shortcut/electron-accelerator";
import { describe, expect, it } from "vite-plus/test";

describe("electron-accelerator", () => {
  it("maps Mod to Electron CommandOrControl", () => {
    expect(toElectronAccelerator("Mod+N")).toBe("CommandOrControl+N");
  });

  it("maps Meta to Electron Command", () => {
    expect(toElectronAccelerator("Shift+Meta+P")).toBe("Shift+Command+P");
  });

  it("maps special keys to Electron accelerator names", () => {
    expect(toElectronAccelerator("Escape")).toBe("Esc");
    expect(toElectronAccelerator("Space")).toBe("Space");
    expect(toElectronAccelerator("ArrowUp")).toBe("Up");
  });
});
