import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  registerSchemesAsPrivileged: vi.fn(),
}));

vi.mock("electron", () => ({
  protocol: {
    registerSchemesAsPrivileged: mocks.registerSchemesAsPrivileged,
  },
}));

import { registerPrivilegedSchemes } from "./protocols";

describe("registerPrivilegedSchemes", () => {
  it("registers assets scheme with required privileges", () => {
    registerPrivilegedSchemes();

    expect(mocks.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      expect.objectContaining({
        scheme: "assets",
        privileges: expect.objectContaining({
          bypassCSP: true,
          corsEnabled: true,
          secure: true,
          standard: true,
          stream: true,
          supportFetchAPI: true,
        }),
      }),
    ]);
  });
});
