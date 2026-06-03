// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import {
  BlockEditorOverlayContainerProvider,
  useEditorOverlayContainer,
} from "./editor-overlay-container";

function OverlayContainerProbe() {
  const container = useEditorOverlayContainer();
  return <output aria-label="overlay container">{container?.dataset.testid ?? "none"}</output>;
}

describe("editor overlay container", () => {
  it("provides the overlay container element to descendants", () => {
    const overlayContainer = document.createElement("div");
    overlayContainer.dataset.testid = "editor-overlay";

    render(
      <BlockEditorOverlayContainerProvider container={overlayContainer}>
        <OverlayContainerProbe />
      </BlockEditorOverlayContainerProvider>,
    );

    expect(screen.getByRole("status", { name: /overlay container/i })).toHaveTextContent(
      "editor-overlay",
    );
  });

  it("returns null when no overlay container is available", () => {
    render(<OverlayContainerProbe />);

    expect(screen.getByRole("status", { name: /overlay container/i })).toHaveTextContent("none");
  });
});
