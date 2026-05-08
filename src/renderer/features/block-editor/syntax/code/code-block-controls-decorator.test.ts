import { describe, expect, it } from "vite-plus/test";

import { calculateCodeToolbarRect } from "./code-block-controls-decorator";

describe("code block controls decorator", () => {
  it("calculates toolbar rect relative to the editor shell", () => {
    expect(
      calculateCodeToolbarRect(
        { left: 100, top: 50, width: 600 },
        { left: 140, top: 90, width: 320 },
        { left: 12, top: 8 },
      ),
    ).toEqual({
      left: 52,
      top: 48,
      width: 320,
    });
  });
});
