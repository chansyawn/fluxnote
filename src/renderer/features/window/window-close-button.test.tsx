// @vitest-environment jsdom

import type { AppPlatform } from "@shared/app/platform";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { WindowCloseButton } from "./window-close-button";

let mountedRoot: { container: HTMLElement; root: Root } | null = null;

function renderWindowCloseButton(platform: AppPlatform, onClick = vi.fn()) {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.append(container);

  act(() => {
    root.render(
      <WindowCloseButton ariaLabel="Close window" platform={platform} onClick={onClick}>
        Close window
      </WindowCloseButton>,
    );
  });

  mountedRoot = { container, root };

  const button = container.querySelector("button");
  if (!button) {
    throw new Error("Window close button was not rendered.");
  }

  return { button, onClick };
}

describe("WindowCloseButton", () => {
  afterEach(() => {
    if (!mountedRoot) {
      return;
    }

    act(() => {
      mountedRoot?.root.unmount();
    });
    mountedRoot.container.remove();
    mountedRoot = null;
  });

  it("renders a Windows-style rectangular close button", () => {
    const { button, onClick } = renderWindowCloseButton("win32");
    const icon = button.querySelector("svg");

    expect(button.dataset.platform).toBe("win32");
    expect(button.className).toContain("h-8");
    expect(button.className).toContain("w-[46px]");
    expect(button.className).toContain("hover:bg-[var(--windows-close-hover)]");
    expect(icon?.className.baseVal).toContain("size-4");
    expect(icon?.className.baseVal).not.toContain("opacity-0");

    act(() => {
      button.click();
    });

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps the compact round close button outside Windows", () => {
    const { button } = renderWindowCloseButton("darwin");
    const icon = button.querySelector("svg");

    expect(button.dataset.platform).toBe("darwin");
    expect(button.className).toContain("size-3");
    expect(button.className).toContain("rounded-full");
    expect(button.className).not.toContain("w-[46px]");
    expect(icon?.className.baseVal).toContain("opacity-0");
  });
});
