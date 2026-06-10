import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("electron", () => ({
  net: {
    fetch: mocks.fetch,
  },
}));

import { fetchFavicon } from "./favicon";

function htmlResponse(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/html" }, status: 200 });
}

function iconResponse(): Response {
  return new Response(Buffer.from([1, 2, 3]), {
    headers: { "content-type": "image/png" },
    status: 200,
  });
}

const ICON_DATA_URL = `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`;

afterEach(() => {
  vi.restoreAllMocks();
  mocks.fetch.mockReset();
});

describe("fetchFavicon", () => {
  it("resolves the icon declared in the page's <link rel=icon>", async () => {
    mocks.fetch.mockImplementation(async (resource: string) =>
      resource.endsWith(".png")
        ? iconResponse()
        : htmlResponse('<link rel="icon" href="/fav.png">'),
    );

    await expect(fetchFavicon("https://example.com/page")).resolves.toBe(ICON_DATA_URL);
    expect(mocks.fetch).toHaveBeenCalledWith("https://example.com/fav.png", expect.anything());
  });

  it("falls back to /favicon.ico when no icon link is declared", async () => {
    mocks.fetch.mockImplementation(async (resource: string) =>
      resource.endsWith("/favicon.ico") ? iconResponse() : htmlResponse("<head></head>"),
    );

    await expect(fetchFavicon("https://example.com/page")).resolves.toBe(ICON_DATA_URL);
    expect(mocks.fetch).toHaveBeenCalledWith("https://example.com/favicon.ico", expect.anything());
  });

  it("returns null when fetching fails", async () => {
    mocks.fetch.mockRejectedValue(new Error("network down"));

    await expect(fetchFavicon("https://example.com")).resolves.toBeNull();
  });

  it("returns null for an invalid url", async () => {
    await expect(fetchFavicon("not-a-url")).resolves.toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
