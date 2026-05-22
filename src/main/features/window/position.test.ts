import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  getCursorScreenPoint: vi.fn(),
  getDisplayNearestPoint: vi.fn(),
}));

vi.mock("electron", () => ({
  screen: {
    getCursorScreenPoint: mocks.getCursorScreenPoint,
    getDisplayNearestPoint: mocks.getDisplayNearestPoint,
  },
}));

import { calculateWindowPosition, saveWindowPosition } from "./position";

describe("window position", () => {
  beforeEach(() => {
    mocks.getCursorScreenPoint.mockReset();
    mocks.getDisplayNearestPoint.mockReset();
    mocks.getCursorScreenPoint.mockReturnValue({ x: 100, y: 100 });
    mocks.getDisplayNearestPoint.mockReturnValue({
      id: 1,
      workArea: { height: 300, width: 400, x: 0, y: 0 },
    });
  });

  it("centers window when no remembered position", () => {
    const pos = calculateWindowPosition({ getSize: () => [200, 100] } as never);

    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it("restores remembered and clamps into work area", () => {
    const win = { getBounds: () => ({ height: 100, width: 200, x: 500, y: 500 }) };
    saveWindowPosition(win as never);

    const pos = calculateWindowPosition({ getSize: () => [200, 100] } as never);

    expect(pos).toEqual({ x: 200, y: 200 });
  });
});
