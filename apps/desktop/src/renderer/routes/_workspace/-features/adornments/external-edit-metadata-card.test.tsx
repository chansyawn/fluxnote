// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  fetchUrlFavicon: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  fetchUrlFavicon: clientMocks.fetchUrlFavicon,
}));

import { ExternalEditMetadataCard } from "./external-edit-metadata-card";

describe("ExternalEditMetadataCard", () => {
  it("shows Mac App source and app name for copy-only macOS external edits", () => {
    renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          appBundleId: "com.example.App",
          appIcon: null,
          appName: "Example",
          elementRole: null,
          mode: "copy_only",
          processId: 123,
          source: "focused_app",
        }}
      />,
    );

    expect(screen.getByTitle("Example")).toBeVisible();
    expect(screen.getByText("Example")).toBeVisible();
    expect(screen.queryByText("No focused input found")).not.toBeInTheDocument();
  });

  it("renders the captured app icon when available", () => {
    const { container } = renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          appBundleId: "com.example.App",
          appIcon: "data:image/png;base64,ICON",
          appName: "Example",
          elementRole: null,
          mode: "write_back",
          processId: 123,
          source: "focused_app",
        }}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute("src", "data:image/png;base64,ICON");
  });

  it("shows the repository name and branch for git-backed CLI edits", () => {
    renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          cwd: "/Users/dev/project/src",
          git: { branch: "feature/x", root: "/Users/dev/project" },
          requestedFilePath: "note.md",
          source: "cli",
          targetFilePath: "/Users/dev/project/src/note.md",
        }}
      />,
    );

    expect(screen.getByText(/project/)).toBeVisible();
    expect(screen.getByText(/feature\/x/)).toBeVisible();
  });

  it("falls back to the file name for non-git CLI edits", () => {
    renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          cwd: "/tmp",
          git: null,
          requestedFilePath: "note.md",
          source: "cli",
          targetFilePath: "/tmp/note.md",
        }}
      />,
    );

    expect(screen.getByText("note.md")).toBeVisible();
  });

  it("shows the page title and lazily fetches the favicon for browser edits", async () => {
    clientMocks.fetchUrlFavicon.mockResolvedValue({
      faviconDataUrl: "data:image/png;base64,FAVICON",
    });

    const { container } = renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          appBundleId: "com.google.Chrome",
          appIcon: null,
          appName: "Google Chrome",
          mode: "write_back",
          processId: 321,
          source: "browser",
          title: "Example Page",
          url: "https://example.com/page",
        }}
      />,
    );

    expect(screen.getByText("Example Page")).toBeVisible();
    await waitFor(() =>
      expect(container.querySelector("img")).toHaveAttribute(
        "src",
        "data:image/png;base64,FAVICON",
      ),
    );
    expect(clientMocks.fetchUrlFavicon).toHaveBeenCalledWith("https://example.com/page");
  });
});
