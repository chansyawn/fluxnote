// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { ExternalEditControls } from "./external-edit-controls";

describe("ExternalEditControls", () => {
  it("shows a submit action for direct external edits", () => {
    renderWithProviders(<ExternalEditControls onCancel={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Submit external edit" })).toBeVisible();
  });

  it("shows a copy action for clipboard external edits", () => {
    renderWithProviders(
      <ExternalEditControls
        submission={{ transport: "clipboard" }}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy external edit" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Submit external edit" })).not.toBeInTheDocument();
  });
});
