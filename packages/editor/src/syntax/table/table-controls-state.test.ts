import { describe, expect, it } from "vite-plus/test";

import { calculateTableHandlePositions } from "./table-controls-state";

function rect(input: { height: number; left: number; top: number; width: number }): DOMRect {
  return {
    bottom: input.top + input.height,
    height: input.height,
    left: input.left,
    right: input.left + input.width,
    y: input.top,
    top: input.top,
    width: input.width,
    x: input.left,
    toJSON: () => input,
  } as DOMRect;
}

describe("table control handle positions", () => {
  it("keeps the row handle centered on the table border when table content scrolls horizontally", () => {
    const tableWrapperRect = rect({ height: 96, left: 40, top: 20, width: 320 });
    const beforeScroll = calculateTableHandlePositions({
      columnStartRect: rect({ height: 32, left: 160, top: 20, width: 120 }),
      rowStartRect: rect({ height: 32, left: 40, top: 52, width: 120 }),
      tableWrapperRect,
    });
    const afterScroll = calculateTableHandlePositions({
      columnStartRect: rect({ height: 32, left: -80, top: 20, width: 120 }),
      rowStartRect: rect({ height: 32, left: -200, top: 52, width: 120 }),
      tableWrapperRect,
    });

    expect(afterScroll.row.inlineStart).toBe(beforeScroll.row.inlineStart);
    expect(afterScroll.row.inlineStart).toBe(40);
    expect(afterScroll.column.inlineStart).toBe(-20);
  });
});
