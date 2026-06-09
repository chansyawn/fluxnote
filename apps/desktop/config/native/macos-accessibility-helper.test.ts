import { describe, expect, it } from "vite-plus/test";

import {
  createMacAccessibilityHelperCompileCommand,
  macAccessibilityHelperOutputName,
  macAccessibilityHelperSource,
} from "./macos-accessibility-helper.ts";

describe("macOS Accessibility helper native config", () => {
  it("points at the Swift helper source", () => {
    expect(macAccessibilityHelperSource).toBe("src/native/macos-accessibility-helper/main.swift");
    expect(macAccessibilityHelperOutputName).toBe("macos-accessibility-helper");
  });

  it("builds the Swift helper with system macOS frameworks", () => {
    expect(createMacAccessibilityHelperCompileCommand("source.swift", "helper")).toEqual({
      args: [
        "swiftc",
        "source.swift",
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
});
