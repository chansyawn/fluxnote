import { describe, expect, it, vi } from "vite-plus/test";

import { createSystemPermissionsService } from "./service";

describe("system permissions service", () => {
  it("returns unsupported Accessibility status outside macOS", () => {
    const isAccessibilityTrusted = vi.fn();
    const service = createSystemPermissionsService({
      macAccessibility: {
        isAccessibilityTrusted,
        isSupported: () => false,
      },
      openExternal: vi.fn(),
    });

    expect(service.getStatus("macos_accessibility")).toEqual({
      granted: false,
      permission: "macos_accessibility",
      supported: false,
    });
    expect(isAccessibilityTrusted).not.toHaveBeenCalled();
  });

  it("checks macOS Accessibility status without prompting", () => {
    const isAccessibilityTrusted = vi.fn(() => true);
    const service = createSystemPermissionsService({
      macAccessibility: {
        isAccessibilityTrusted,
        isSupported: () => true,
      },
      openExternal: vi.fn(),
    });

    expect(service.getStatus("macos_accessibility")).toEqual({
      granted: true,
      permission: "macos_accessibility",
      supported: true,
    });
    expect(isAccessibilityTrusted).toHaveBeenCalledWith(false);
  });

  it("requests macOS Accessibility permission with prompting", () => {
    const isAccessibilityTrusted = vi.fn(() => false);
    const service = createSystemPermissionsService({
      macAccessibility: {
        isAccessibilityTrusted,
        isSupported: () => true,
      },
      openExternal: vi.fn(),
    });

    expect(service.request("macos_accessibility")).toEqual({
      granted: false,
      permission: "macos_accessibility",
      supported: true,
    });
    expect(isAccessibilityTrusted).toHaveBeenCalledWith(true);
  });

  it("opens macOS Accessibility settings as best effort", async () => {
    const openExternal = vi.fn(async () => undefined);
    const service = createSystemPermissionsService({
      macAccessibility: {
        isAccessibilityTrusted: vi.fn(),
        isSupported: () => true,
      },
      openExternal,
    });

    await service.openSettings("macos_accessibility");

    expect(openExternal).toHaveBeenCalledWith(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    );
  });

  it("does not open settings outside macOS", async () => {
    const openExternal = vi.fn(async () => undefined);
    const service = createSystemPermissionsService({
      macAccessibility: {
        isAccessibilityTrusted: vi.fn(),
        isSupported: () => false,
      },
      openExternal,
    });

    await service.openSettings("macos_accessibility");

    expect(openExternal).not.toHaveBeenCalled();
  });
});
