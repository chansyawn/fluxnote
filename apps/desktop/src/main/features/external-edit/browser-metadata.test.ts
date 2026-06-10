import type { MacAccessibilityTargetMetadata } from "@fluxnotes/mac-native";
import { describe, expect, it, vi } from "vite-plus/test";

import { resolveBrowserMetadata } from "./browser-metadata";

function createTarget(
  overrides?: Partial<MacAccessibilityTargetMetadata>,
): MacAccessibilityTargetMetadata {
  return {
    appBundleId: "com.google.Chrome",
    appIcon: null,
    appName: "Google Chrome",
    elementRole: "AXTextArea",
    processId: 321,
    ...overrides,
  };
}

function htmlResponse(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/html" }, status: 200 });
}

function iconResponse(): Response {
  return new Response(Buffer.from([1, 2, 3]), {
    headers: { "content-type": "image/png" },
    status: 200,
  });
}

describe("resolveBrowserMetadata", () => {
  it("returns null when the focused app is not a known browser", async () => {
    const deps = { fetch: vi.fn(), runAppleScript: vi.fn() };

    await expect(
      resolveBrowserMetadata(createTarget({ appBundleId: "com.apple.Notes" }), deps),
    ).resolves.toBeNull();
    expect(deps.runAppleScript).not.toHaveBeenCalled();
  });

  it("captures url, title, and favicon from the active browser tab", async () => {
    const runAppleScript = vi.fn(async () => "https://example.com/pageExample Page\n");
    const fetch = vi.fn(async (resource: string) =>
      resource.endsWith(".png")
        ? iconResponse()
        : htmlResponse('<link rel="icon" href="/fav.png">'),
    );

    await expect(
      resolveBrowserMetadata(createTarget(), { fetch: fetch as never, runAppleScript }),
    ).resolves.toEqual({
      faviconDataUrl: `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`,
      title: "Example Page",
      url: "https://example.com/page",
    });
  });

  it("returns null when AppleScript fails", async () => {
    const runAppleScript = vi.fn(async () => {
      throw new Error("no front window");
    });

    await expect(
      resolveBrowserMetadata(createTarget(), { fetch: vi.fn() as never, runAppleScript }),
    ).resolves.toBeNull();
  });

  it("keeps url and title when favicon resolution fails", async () => {
    const runAppleScript = vi.fn(async () => "https://example.comExample");
    const fetch = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      resolveBrowserMetadata(createTarget(), { fetch: fetch as never, runAppleScript }),
    ).resolves.toEqual({
      faviconDataUrl: null,
      title: "Example",
      url: "https://example.com",
    });
  });
});
