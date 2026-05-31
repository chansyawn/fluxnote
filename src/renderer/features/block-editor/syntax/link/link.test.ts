// @vitest-environment jsdom

import type { EditorView } from "@milkdown/kit/prose/view";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { type ActiveMilkdownLink, getActiveLinkAnchor } from "./link-model";

const originalRangeGetClientRectsDescriptor = Object.getOwnPropertyDescriptor(
  Range.prototype,
  "getClientRects",
);

function createDomRectList(rects: DOMRect[]): DOMRectList {
  const rectList = {
    item: (index: number) => rects[index] ?? null,
    length: rects.length,
    [Symbol.iterator]: function* iterateRects() {
      yield* rects;
    },
  } as DOMRectList;

  for (const [index, rect] of rects.entries()) {
    Object.defineProperty(rectList, index, {
      configurable: true,
      value: rect,
    });
  }

  return rectList;
}

describe("link model", () => {
  afterEach(() => {
    if (originalRangeGetClientRectsDescriptor) {
      Object.defineProperty(
        Range.prototype,
        "getClientRects",
        originalRangeGetClientRectsDescriptor,
      );
    } else {
      Reflect.deleteProperty(Range.prototype, "getClientRects");
    }
    vi.restoreAllMocks();
  });

  it("uses the rendered DOM range for multiline link anchors", () => {
    const root = document.createElement("div");
    const text = document.createTextNode("Fluxnotes wrapped link");
    root.append(text);
    document.body.append(root);
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: vi.fn(() =>
        createDomRectList([new DOMRect(80, 10, 40, 12), new DOMRect(20, 26, 140, 12)]),
      ),
    });
    const coordsAtPos = vi.fn(() => {
      throw new Error("coordsAtPos should not be used when DOM range geometry is available.");
    });
    const view = {
      coordsAtPos,
      dom: root,
      domAtPos: (position: number) => ({ node: text, offset: position }),
    } as unknown as EditorView;
    const activeLink: ActiveMilkdownLink = {
      from: 0,
      href: "https://example.com",
      text: text.textContent ?? "",
      to: text.length,
      view,
    };

    const rect = getActiveLinkAnchor(activeLink).getBoundingClientRect();

    expect(rect.left).toBe(20);
    expect(rect.top).toBe(10);
    expect(rect.width).toBe(140);
    expect(rect.height).toBe(28);
    expect(coordsAtPos).not.toHaveBeenCalled();
  });
});
