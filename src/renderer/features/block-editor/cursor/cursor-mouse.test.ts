// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import {
  findGapCursorHitTarget,
  isInteractiveEventTarget,
  type GapCursorHitTarget,
} from "./cursor-mouse";

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

  it("finds gaps at vertical bounds inclusively", () => {
    const gap = target("gap-between", rect(20, 80), rect(100, 160));

    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 80 },
        rootRect,
        targets: [gap],
      }),
    ).toBe("gap-between");
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 100 },
        rootRect,
        targets: [gap],
      }),
    ).toBe("gap-between");
  });

  it("finds the matching gap when multiple candidates exist", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 130 },
        rootRect,
        targets: [
          target("first-gap", null, rect(20, 80)),
          target("second-gap", rect(100, 120), rect(140, 180)),
        ],
      }),
    ).toBe("second-gap");
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

  it("treats nested editor controls as interactive event targets", () => {
    const root = document.createElement("section");
    const button = document.createElement("button");
    const tableControl = document.createElement("span");
    tableControl.setAttribute("data-table-control", "true");
    button.append(tableControl);
    root.append(button);

    expect(isInteractiveEventTarget(root, tableControl)).toBe(true);
  });

  it("ignores non-interactive event targets and targets outside the editor", () => {
    const root = document.createElement("section");
    const paragraph = document.createElement("p");
    const outsideButton = document.createElement("button");
    root.append(paragraph);

    expect(isInteractiveEventTarget(root, paragraph)).toBe(false);
    expect(isInteractiveEventTarget(root, outsideButton)).toBe(false);
    expect(isInteractiveEventTarget(root, null)).toBe(false);
  });
});
