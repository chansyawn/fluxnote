import { describe, expect, it } from "vite-plus/test";

import { createMacAccessibilityNative, MacNativeError } from "./index";

describe("mac native facade", () => {
  it("returns unsupported native integration on non-macOS platforms", async () => {
    const native = createMacAccessibilityNative();

    if (process.platform === "darwin") {
      expect(native.isSupported()).toBe(true);
      return;
    }

    expect(native.isSupported()).toBe(false);
    expect(native.isAccessibilityTrusted(true)).toBe(false);
    await expect(native.capture()).rejects.toMatchObject({
      code: "NATIVE.UNSUPPORTED_PLATFORM",
      name: "MacNativeError",
    } satisfies Partial<MacNativeError>);
  });
});
