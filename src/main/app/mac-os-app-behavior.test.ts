import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  setActivationPolicy: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    setActivationPolicy: mocks.setActivationPolicy,
  },
}));

import { configureMacOSAppBehavior } from "./mac-os-app-behavior";

const originalPlatform = process.platform;

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

describe("macOS app behavior", () => {
  beforeEach(() => {
    setPlatform("linux");
    vi.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it("configures macOS accessory app behavior", () => {
    setPlatform("darwin");

    configureMacOSAppBehavior();

    expect(mocks.setActivationPolicy).toHaveBeenCalledWith("accessory");
  });

  it("does nothing outside macOS", () => {
    setPlatform("win32");

    configureMacOSAppBehavior();

    expect(mocks.setActivationPolicy).not.toHaveBeenCalled();
  });
});
