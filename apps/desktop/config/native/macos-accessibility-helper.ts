import type { Stats } from "node:fs";

export const macAccessibilityHelperSources = [
  "src/native/macos-accessibility-helper/helper-errors.swift",
  "src/native/macos-accessibility-helper/helper-protocol.swift",
  "src/native/macos-accessibility-helper/ax-attributes.swift",
  "src/native/macos-accessibility-helper/app-metadata.swift",
  "src/native/macos-accessibility-helper/editable-element-lookup.swift",
  "src/native/macos-accessibility-helper/accessibility-session.swift",
  "src/native/macos-accessibility-helper/command-handler.swift",
  "src/native/macos-accessibility-helper/main.swift",
];
export const macAccessibilityHelperOutputName = "macos-accessibility-helper";

export interface MacAccessibilityHelperCompileCommand {
  args: string[];
  command: string;
  label: string;
}

export function createMacAccessibilityHelperCompileCommand(
  sourcePaths: string[],
  outputPath: string,
): MacAccessibilityHelperCompileCommand {
  return {
    args: [
      "swiftc",
      ...sourcePaths,
      "-framework",
      "ApplicationServices",
      "-framework",
      "AppKit",
      "-o",
      outputPath,
    ],
    command: "xcrun",
    label: "xcrun swiftc",
  };
}

export function isMacAccessibilityHelperOutputCurrent(
  sourceStats: Pick<Stats, "mtimeMs">[],
  outputStats: Pick<Stats, "mtimeMs">,
): boolean {
  const newestSourceMtime = Math.max(...sourceStats.map((sourceStat) => sourceStat.mtimeMs));
  return outputStats.mtimeMs >= newestSourceMtime;
}
