import type { MacAccessibilityTargetMetadata } from "@fluxnotes/mac-native";
import { describe, expect, it, vi } from "vite-plus/test";

import { resolveBrowserMetadata } from "./browser-metadata";

function createTarget(
  overrides?: Partial<MacAccessibilityTargetMetadata>,
): MacAccessibilityTargetMetadata {
  return {
    appBundleId: "com.google.Chrome",
    appIcon: null,
    appName: "Google Chrome",
    elementRole: "AXTextArea",
    processId: 321,
    ...overrides,
  };
}

describe("resolveBrowserMetadata", () => {
  it("returns null when the focused app is not a known browser", async () => {
    const runAppleScript = vi.fn();

    await expect(
      resolveBrowserMetadata(createTarget({ appBundleId: "com.apple.Notes" }), { runAppleScript }),
    ).resolves.toBeNull();
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it("captures url and title from the active browser tab", async () => {
    const runAppleScript = vi.fn(async () => "https://example.com/pageExample Page\n");

    await expect(resolveBrowserMetadata(createTarget(), { runAppleScript })).resolves.toEqual({
      title: "Example Page",
      url: "https://example.com/page",
    });
  });

  it("returns null when AppleScript fails", async () => {
    const runAppleScript = vi.fn(async () => {
      throw new Error("no front window");
    });

    await expect(resolveBrowserMetadata(createTarget(), { runAppleScript })).resolves.toBeNull();
  });

  it("returns null when the active tab has no url", async () => {
    const runAppleScript = vi.fn(async () => "Untitled");

    await expect(resolveBrowserMetadata(createTarget(), { runAppleScript })).resolves.toBeNull();
  });
});
