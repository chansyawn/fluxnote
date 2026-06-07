// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import {
  claimGapCursorMouseEvent,
  findGapCursorHitTarget,
  isInteractiveEventTarget,
  preventNativeSelectionForGapCursorMouseEvent,
  type GapCursorHitTarget,
} from "./cursor-mouse";

function rect(top: number, bottom: number, left = 0, right = 200): DOMRect {
  return { bottom, left, right, top } as DOMRect;
}

function target(
  key: string,
  previousRect: DOMRect | null,
  nextRect: DOMRect | null,
  containerRect: DOMRect = rect(0, 200),
): GapCursorHitTarget {
  return { containerRect, key, nextRect, previousRect };
}

function mouseEvent(type: string, button = 0): MouseEvent {
  return new MouseEvent(type, { bubbles: true, button, cancelable: true });
}

describe("gap cursor mouse hit testing", () => {
  it("finds gaps before the first boundary block", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 10 },
        targets: [target("gap-before", null, rect(20, 80))],
      }),
    ).toBe("gap-before");
  });

  it("finds gaps between boundary blocks", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 90 },
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBe("gap-between");
  });

  it("finds gaps at vertical bounds inclusively", () => {
    const gap = target("gap-between", rect(20, 80), rect(100, 160));

    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 80 },
        targets: [gap],
      }),
    ).toBe("gap-between");
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 100 },
        targets: [gap],
      }),
    ).toBe("gap-between");
  });

  it("finds the matching gap when multiple candidates exist", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 130 },
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
        targets: [target("gap-after", rect(20, 160), null)],
      }),
    ).toBe("gap-after");
  });

  it("ignores points inside boundary blocks", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 50 },
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBeNull();
  });

  it("ignores points outside the editor content width", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 240, y: 90 },
        targets: [target("gap-between", rect(20, 80), rect(100, 160))],
      }),
    ).toBeNull();
  });

  it("ignores overlapping boundary rects with no visible gap", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 100, y: 90 },
        targets: [target("gap-between", rect(20, 100), rect(80, 160))],
      }),
    ).toBeNull();
  });

  it("uses each gap container width for nested hit testing", () => {
    expect(
      findGapCursorHitTarget({
        point: { x: 20, y: 90 },
        targets: [target("nested-gap", rect(20, 80), rect(100, 160), rect(0, 200, 40, 180))],
      }),
    ).toBeNull();

    expect(
      findGapCursorHitTarget({
        point: { x: 60, y: 90 },
        targets: [target("nested-gap", rect(20, 80), rect(100, 160), rect(0, 200, 40, 180))],
      }),
    ).toBe("nested-gap");
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

  it("prevents native selection for primary mouse button events on gap targets", () => {
    const event = mouseEvent("mousedown");

    expect(preventNativeSelectionForGapCursorMouseEvent(event, "gap-between")).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not prevent native selection outside gap targets", () => {
    const event = mouseEvent("mousedown");

    expect(preventNativeSelectionForGapCursorMouseEvent(event, null)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not prevent native selection for non-primary mouse buttons", () => {
    const event = mouseEvent("mousedown", 1);

    expect(preventNativeSelectionForGapCursorMouseEvent(event, "gap-between")).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("claims primary click events on gap targets before Lexical handles root clicks", () => {
    const event = mouseEvent("click");

    expect(claimGapCursorMouseEvent(event, "gap-between")).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });
});
