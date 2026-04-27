import { AppInvokeError } from "@renderer/app/invoke";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

const useQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: unknown }) => children,
}));

vi.mock("@renderer/clients", () => ({
  greet: vi.fn(),
}));

import {
  SampleGreetPanel,
  formatDetails,
  shouldRefetchSameQuery,
} from "@renderer/routes/lab/-features/sample-greet-panel";

function setupQueryState(partial: Partial<ReturnType<typeof useQueryMock>> = {}): void {
  useQueryMock.mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
    ...partial,
  });
}

describe("sample greet panel", () => {
  it("renders success state when query resolves", () => {
    setupQueryState({
      data: { message: "Hello, FluxNote! This message is from the Electron backend." },
    });

    const html = renderToStaticMarkup(<SampleGreetPanel />);

    expect(html).toContain("Success");
    expect(html).toContain("Hello, FluxNote! This message is from the Electron backend.");
  });

  it("renders structured error details when invoke fails with AppInvokeError", () => {
    setupQueryState({
      error: new AppInvokeError({
        type: "BUSINESS.NOT_FOUND",
        message: "Resource not found: missing",
        details: { id: "block-1" },
      }),
      isError: true,
    });

    const html = renderToStaticMarkup(<SampleGreetPanel />);

    expect(html).toContain("Structured error");
    expect(html).toContain("BUSINESS.NOT_FOUND");
    expect(html).toContain("Resource not found: missing");
    expect(html).toContain("&quot;id&quot;: &quot;block-1&quot;");
  });

  it("formats details and refetch condition helpers predictably", () => {
    expect(formatDetails(undefined)).toBe("");
    expect(formatDetails("message")).toBe("message");
    expect(formatDetails({ key: "value" })).toContain('"key": "value"');

    expect(shouldRefetchSameQuery("FluxNote", "FluxNote")).toBe(true);
    expect(shouldRefetchSameQuery("FluxNote", "Other")).toBe(false);
  });
});
