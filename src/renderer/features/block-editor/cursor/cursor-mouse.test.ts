import { describe, expect, it } from "vite-plus/test";

import { findGapCursorHitTarget, type GapCursorHitTarget } from "./cursor-mouse";

function rect(top: number, bottom: number, left = 0, right = 200): DOMRect {
  return { bottom, left, right, top } as DOMRect;
}

function target(
  key: string,
  previousRect: DOMRect | null,
  nextRect: DOMRect | null,
): GapCursorHitTarget {
  return { key, nextRect, previousRect };
}

describe("gap cursor mouse hit testing", () => {
  const rootRect = rect(0, 200);

  it("finds gaps before the first boundary block", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 10 },
        rootRect,
        targets: [target("gap-before", null, rect(20, 80))],
      }),
    ).toBe("gap-before");
  });

  it("finds gaps between boundary blocks", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 90 },
        rootRect,
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBe("gap-between");
  });

  it("finds gaps after the last boundary block", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 180 },
        rootRect,
        targets: [target("gap-after", rect(20, 160), null)],
      }),
    ).toBe("gap-after");
  });

  it("ignores points inside boundary blocks", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 50 },
        rootRect,
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBeNull();
  });

  it("ignores points outside the editor content width", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 240, y: 90 },
        rootRect,
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBeNull();
  });

  it("ignores overlapping boundary rects with no visible gap", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 90 },
        rootRect,
        targets: [target("gap-between", rect(20, 100), rect(80, 160))],
      }),
    ).toBeNull();
  });
});
