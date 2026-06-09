export const macAccessibilityHelperSource = "src/native/macos-accessibility-helper/main.swift";
export const macAccessibilityHelperOutputName = "macos-accessibility-helper";

export interface MacAccessibilityHelperCompileCommand {
  args: string[];
  command: string;
  label: string;
}

export function createMacAccessibilityHelperCompileCommand(
  sourcePath: string,
  outputPath: string,
): MacAccessibilityHelperCompileCommand {
  return {
    args: [
      "swiftc",
      sourcePath,
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
