export const macAccessibilityHelperSource = "src/native/macos-accessibility-helper/main.m";
export const macAccessibilityHelperOutputName = "macos-accessibility-helper";

export function createMacAccessibilityHelperCompileArgs(
  sourcePath: string,
  outputPath: string,
): string[] {
  return [
    sourcePath,
    "-fobjc-arc",
    "-framework",
    "ApplicationServices",
    "-framework",
    "AppKit",
    "-o",
    outputPath,
  ];
}
