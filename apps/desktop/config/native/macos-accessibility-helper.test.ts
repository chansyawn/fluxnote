import { describe, expect, it } from "vite-plus/test";

import {
  createMacAccessibilityHelperCompileCommand,
  isMacAccessibilityHelperOutputCurrent,
  macAccessibilityHelperOutputName,
  macAccessibilityHelperSources,
} from "./macos-accessibility-helper.ts";

describe("macOS Accessibility helper native config", () => {
  it("points at the Swift helper sources", () => {
    expect(macAccessibilityHelperSources).toEqual([
      "src/native/macos-accessibility-helper/helper-errors.swift",
      "src/native/macos-accessibility-helper/helper-protocol.swift",
      "src/native/macos-accessibility-helper/ax-attributes.swift",
      "src/native/macos-accessibility-helper/app-metadata.swift",
      "src/native/macos-accessibility-helper/editable-element-lookup.swift",
      "src/native/macos-accessibility-helper/accessibility-session.swift",
      "src/native/macos-accessibility-helper/command-handler.swift",
      "src/native/macos-accessibility-helper/main.swift",
    ]);
    expect(macAccessibilityHelperOutputName).toBe("macos-accessibility-helper");
  });

  it("builds the Swift helper with system macOS frameworks", () => {
    expect(createMacAccessibilityHelperCompileCommand(["a.swift", "b.swift"], "helper")).toEqual({
      args: [
        "swiftc",
        "a.swift",
        "b.swift",
        "-framework",
        "ApplicationServices",
        "-framework",
        "AppKit",
        "-o",
        "helper",
      ],
      command: "xcrun",
      label: "xcrun swiftc",
    });
  });

  it("reuses helper output only when it is newer than every Swift source", () => {
    expect(
      isMacAccessibilityHelperOutputCurrent([{ mtimeMs: 100 }, { mtimeMs: 200 }], { mtimeMs: 200 }),
    ).toBe(true);
    expect(
      isMacAccessibilityHelperOutputCurrent([{ mtimeMs: 100 }, { mtimeMs: 201 }], { mtimeMs: 200 }),
    ).toBe(false);
  });
});
