// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import { applyCodeBlockDisplayConfig, calculateCodeToolbarRect } from "./code-display";

describe("code display", () => {
  it("calculates overlay rects relative to the editor shell", () => {
    expect(
      calculateCodeToolbarRect(
        { height: 200, left: 10, top: 20, width: 300 },
        { height: 80, left: 30, top: 50, width: 240 },
        { left: 4, top: 8 },
      ),
    ).toEqual({
      height: 80,
      left: 24,
      top: 38,
      width: 240,
    });
  });

  it("toggles line number display class without measuring line height", () => {
    const element = document.createElement("code");

    applyCodeBlockDisplayConfig(element, { showLineNumbers: true });

    expect(element).toHaveClass("block-editor__code--line-numbers");

    applyCodeBlockDisplayConfig(element, { showLineNumbers: false });

    expect(element).not.toHaveClass("block-editor__code--line-numbers");
  });
});
