// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { ExternalEditMetadataCard } from "./external-edit-metadata-card";

describe("ExternalEditMetadataCard", () => {
  it("shows Mac App source and app name for copy-only macOS external edits", () => {
    renderWithProviders(
      <ExternalEditMetadataCard
        trigger={{
          appBundleId: "com.example.App",
          appName: "Example",
          elementRole: null,
          mode: "copy_only",
          processId: 123,
          source: "mac_accessibility",
        }}
      />,
    );

    expect(screen.getByTitle("Example")).toBeVisible();
    expect(screen.getByText("Example")).toBeVisible();
    expect(screen.queryByText("No focused input found")).not.toBeInTheDocument();
  });
});
