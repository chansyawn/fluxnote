// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const preferenceMocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  useThemePreference: vi.fn(),
}));

vi.mock("@renderer/features/preferences/preferences-query", () => ({
  useThemePreference: preferenceMocks.useThemePreference,
}));

import { ThemeStateProvider, useThemeState } from "./theme";

function ThemeProbe() {
  const { resolvedTheme, setThemeMode, themeMode } = useThemeState();

  return (
    <button type="button" onClick={() => setThemeMode("light")}>
      {themeMode}:{resolvedTheme}
    </button>
  );
}

function renderThemeProvider() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ThemeStateProvider>
        <ThemeProbe />
      </ThemeStateProvider>,
    );
  });

  return {
    container,
    unmount(): void {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("ThemeStateProvider", () => {
  let mountedRoot: { container: HTMLElement; unmount: () => void } | null = null;

  beforeEach(() => {
    preferenceMocks.useThemePreference.mockReturnValue({
      theme: "dark",
      setTheme: preferenceMocks.setTheme,
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.documentElement.classList.remove("dark");
    preferenceMocks.setTheme.mockReset();
    preferenceMocks.useThemePreference.mockReset();
    vi.restoreAllMocks();
  });

  it("exposes theme preference and applies resolved dark class", () => {
    mountedRoot = renderThemeProvider();

    expect(mountedRoot.container.textContent).toBe("dark:dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("writes theme preference changes", () => {
    mountedRoot = renderThemeProvider();

    act(() => {
      mountedRoot?.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(preferenceMocks.setTheme).toHaveBeenCalledWith("light");
  });
});
