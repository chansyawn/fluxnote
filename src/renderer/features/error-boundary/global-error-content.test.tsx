// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  destroyWindow: vi.fn(),
  hideWindow: vi.fn(),
  openExternalUrl: vi.fn(),
  restartApp: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  destroyWindow: clientMocks.destroyWindow,
  hideWindow: clientMocks.hideWindow,
  openExternalUrl: clientMocks.openExternalUrl,
  restartApp: clientMocks.restartApp,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { BlockErrorFallback } from "./block-error-fallback";
import { GlobalErrorContent } from "./global-error-content";

describe("GlobalErrorContent", () => {
  beforeEach(() => {
    clientMocks.destroyWindow.mockReset();
    clientMocks.destroyWindow.mockResolvedValue(undefined);
    clientMocks.hideWindow.mockReset();
    clientMocks.hideWindow.mockResolvedValue(undefined);
    clientMocks.openExternalUrl.mockReset();
    clientMocks.openExternalUrl.mockResolvedValue(undefined);
    clientMocks.restartApp.mockReset();
    clientMocks.restartApp.mockResolvedValue(undefined);
    toastMocks.error.mockReset();
  });

  it("opens a new GitHub issue when reporting the error", async () => {
    const user = userEvent.setup();
    render(<GlobalErrorContent error={new Error("boom")} />);

    await user.click(screen.getByRole("button", { name: "Report issue" }));

    expect(clientMocks.openExternalUrl).toHaveBeenCalledWith({
      url: "https://github.com/chansyawn/fluxnotes/issues/new",
    });
  });

  it("restarts the app from the global error card", async () => {
    const user = userEvent.setup();
    render(<GlobalErrorContent error={new Error("boom")} />);

    await user.click(screen.getByRole("button", { name: "Restart app" }));

    expect(clientMocks.restartApp).toHaveBeenCalledOnce();
  });

  it("exits the app from the global error card", async () => {
    const user = userEvent.setup();
    render(<GlobalErrorContent error={new Error("boom")} />);

    await user.click(screen.getByRole("button", { name: "Exit app" }));

    expect(clientMocks.destroyWindow).toHaveBeenCalledOnce();
    expect(clientMocks.hideWindow).not.toHaveBeenCalled();
  });

  it("falls back to hiding the window when exiting fails", async () => {
    const user = userEvent.setup();
    clientMocks.destroyWindow.mockRejectedValueOnce(new Error("destroy failed"));
    render(<GlobalErrorContent error={new Error("boom")} />);

    await user.click(screen.getByRole("button", { name: "Exit app" }));

    expect(clientMocks.destroyWindow).toHaveBeenCalledOnce();
    expect(clientMocks.hideWindow).toHaveBeenCalledOnce();
  });
});

describe("BlockErrorFallback", () => {
  it("keeps block-local recovery actions", () => {
    render(
      <BlockErrorFallback
        blockId="block-1"
        error={new Error("block failed")}
        resetErrorBoundary={vi.fn()}
        onDeleteBlock={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Retry block" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete block" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Report issue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restart app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit app" })).not.toBeInTheDocument();
  });
});
