// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  BlockEditorOverlayContainerProvider,
  useEditorOverlayContainer,
} from "./editor-overlay-container";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoot: Root | null = null;
let mountedContainer: HTMLElement | null = null;

function render(element: ReactNode): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  mountedRoot = root;
  mountedContainer = container;
  return container;
}

function OverlayContainerProbe() {
  const container = useEditorOverlayContainer();
  return <span data-container-id={container?.dataset.testid ?? "none"} />;
}

describe("editor overlay container", () => {
  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot?.unmount();
      });
    }

    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
  });

  it("provides the overlay container element to descendants", () => {
    const overlayContainer = document.createElement("div");
    overlayContainer.dataset.testid = "editor-overlay";

    const container = render(
      <BlockEditorOverlayContainerProvider container={overlayContainer}>
        <OverlayContainerProbe />
      </BlockEditorOverlayContainerProvider>,
    );

    expect(container.querySelector("span")?.dataset.containerId).toBe("editor-overlay");
  });

  it("returns null when no overlay container is available", () => {
    const container = render(<OverlayContainerProbe />);

    expect(container.querySelector("span")?.dataset.containerId).toBe("none");
  });
});
