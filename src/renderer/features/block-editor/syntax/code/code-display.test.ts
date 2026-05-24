// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import { calculateCodeToolbarRect, measureCodeLineNumberDisplay } from "./code-display";

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

  it("measures logical line numbers from code padding and line height", () => {
    const element = document.createElement("code");
    element.style.borderStyle = "solid";
    element.style.fontFamily = "monospace";
    element.style.fontSize = "14px";
    element.style.lineHeight = "20px";
    element.style.paddingInlineStart = "48px";
    element.style.setProperty("--block-editor-code-line-number-padding-inline-start", "0.5rem");
    element.style.setProperty("--block-editor-code-line-number-width", "1.75rem");
    element.style.setProperty("border-block-end-width", "1px");
    element.style.setProperty("border-block-start-width", "1px");
    element.style.setProperty("border-inline-start-width", "1px");
    element.style.setProperty("padding-block-end", "12px");
    element.style.setProperty("padding-block-start", "32px");
    document.body.append(element);

    const display = measureCodeLineNumberDisplay(
      element,
      "first\n\nthird",
      { showLineNumbers: true, wordWrap: false },
      { height: 200, left: 2, top: 3, width: 400 },
      { height: 100, left: 12, top: 23, width: 300 },
      { left: 0, top: 0 },
    );

    element.remove();

    expect(display).toMatchObject({
      gutter: {
        height: 54,
        left: 19,
        lineHeight: "20px",
        top: 53,
        width: 28,
      },
      lineNumbers: [
        { number: 1, top: 0 },
        { number: 2, top: 20 },
        { number: 3, top: 40 },
      ],
    });
  });

  it("skips line number display when line numbers are disabled", () => {
    const element = document.createElement("code");

    expect(
      measureCodeLineNumberDisplay(
        element,
        "first",
        { showLineNumbers: false, wordWrap: false },
        { height: 200, left: 2, top: 3, width: 400 },
        { height: 100, left: 12, top: 23, width: 300 },
        { left: 0, top: 0 },
      ),
    ).toBeNull();
  });
});
