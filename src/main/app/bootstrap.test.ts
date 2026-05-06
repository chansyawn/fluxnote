import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBackendRuntime: vi.fn(),
  dockHide: vi.fn(),
  setActivationPolicy: vi.fn(),
  on: vi.fn(),
  registerPrivilegedSchemes: vi.fn(),
  whenReady: vi.fn(() => Promise.resolve()),
}));

vi.mock("electron", () => ({
  app: {
    dock: { hide: mocks.dockHide },
    setActivationPolicy: mocks.setActivationPolicy,
    on: mocks.on,
    whenReady: mocks.whenReady,
  },
}));

vi.mock("./protocols", () => ({ registerPrivilegedSchemes: mocks.registerPrivilegedSchemes }));
vi.mock("./runtime", () => ({ createBackendRuntime: mocks.createBackendRuntime }));

import { startPrimaryInstance } from "./bootstrap";

describe("startPrimaryInstance", () => {
  const runtime = {
    activate: vi.fn(),
    handleOpenUrl: vi.fn(),
    handleSecondInstance: vi.fn(),
    quitWhenAllWindowsClosed: vi.fn(),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBackendRuntime.mockReturnValue(runtime);
  });

  it("registers app events and forwards handlers to runtime", async () => {
    startPrimaryInstance();

    expect(mocks.registerPrivilegedSchemes).toHaveBeenCalledTimes(1);
    expect(mocks.on).toHaveBeenCalledWith("second-instance", expect.any(Function));
    expect(mocks.on).toHaveBeenCalledWith("open-url", expect.any(Function));
    expect(mocks.on).toHaveBeenCalledWith("before-quit", expect.any(Function));
    expect(mocks.on).toHaveBeenCalledWith("window-all-closed", expect.any(Function));

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.setActivationPolicy).toHaveBeenCalledWith("accessory");
    expect(mocks.dockHide).toHaveBeenCalledTimes(1);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(mocks.on).toHaveBeenCalledWith("activate", expect.any(Function));

    const activate = mocks.on.mock.calls.find(([name]) => name === "activate")?.[1] as () => void;
    activate();
    expect(runtime.activate).toHaveBeenCalledTimes(1);

    const secondInstance = mocks.on.mock.calls.find(
      ([name]) => name === "second-instance",
    )?.[1] as (event: unknown, argv: string[]) => void;
    secondInstance({}, ["flux://open/1"]);
    expect(runtime.handleSecondInstance).toHaveBeenCalledWith(["flux://open/1"]);

    const openUrl = mocks.on.mock.calls.find(([name]) => name === "open-url")?.[1] as (
      event: { preventDefault: () => void },
      url: string,
    ) => void;
    const preventDefault = vi.fn();
    openUrl({ preventDefault }, "flux://open/2");
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(runtime.handleOpenUrl).toHaveBeenCalledWith("flux://open/2");

    const beforeQuit = mocks.on.mock.calls.find(
      ([name]) => name === "before-quit",
    )?.[1] as () => void;
    beforeQuit();
    expect(runtime.stop).toHaveBeenCalledTimes(1);

    const windowAllClosed = mocks.on.mock.calls.find(
      ([name]) => name === "window-all-closed",
    )?.[1] as (() => void) | undefined;
    windowAllClosed?.();
    expect(runtime.quitWhenAllWindowsClosed).toHaveBeenCalledTimes(1);
  });
});
