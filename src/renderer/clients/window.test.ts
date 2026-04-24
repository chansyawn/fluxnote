import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const invokeCommandMock = vi.hoisted(() => vi.fn());
const subscribeEventMock = vi.hoisted(() => vi.fn());

vi.mock("@renderer/app/invoke", () => ({
  invokeCommand: invokeCommandMock,
  subscribeEvent: subscribeEventMock,
}));

import {
  destroyWindow,
  hideWindow,
  onWindowCloseRequested,
  onWindowFocusChanged,
  toggleMainWindowVisibility,
} from "@renderer/clients/window";

describe("window client helpers", () => {
  beforeEach(() => {
    invokeCommandMock.mockReset();
    subscribeEventMock.mockReset();
  });

  it("invokes window commands through the transport", async () => {
    invokeCommandMock.mockResolvedValue(undefined);

    await hideWindow();
    await destroyWindow();
    await toggleMainWindowVisibility();

    expect(invokeCommandMock.mock.calls).toEqual([
      ["windowHide", undefined],
      ["windowDestroy", undefined],
      ["windowToggle", undefined],
    ]);
  });

  it("adapts window event helpers to simple callback signatures", () => {
    const closeHandler = vi.fn();
    const focusHandler = vi.fn();
    let closeListener: (() => void) | undefined;
    let focusListener: ((payload: boolean) => void) | undefined;

    subscribeEventMock.mockImplementation((key, handler) => {
      if (key === "windowCloseRequested") {
        closeListener = handler as () => void;
      }
      if (key === "windowFocusChanged") {
        focusListener = handler as (payload: boolean) => void;
      }
      return vi.fn();
    });

    onWindowCloseRequested(closeHandler);
    onWindowFocusChanged(focusHandler);

    if (closeListener) {
      closeListener();
    }
    if (focusListener) {
      focusListener(true);
    }

    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(focusHandler).toHaveBeenCalledWith(true);
  });
});
