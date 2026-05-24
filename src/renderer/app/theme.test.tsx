// @vitest-environment jsdom

import { mockMatchMedia } from "@renderer/test/events";
import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const preferenceMocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  useThemePreference: vi.fn(),
}));

vi.mock("@renderer/features/preferences/preferences-query", () => ({
  useThemePreference: preferenceMocks.useThemePreference,
}));

import { ThemeStateProvider, useThemeState } from "./theme";

function ThemePreferenceProbe() {
  const { resolvedTheme, setThemeMode, themeMode } = useThemeState();

  return (
    <section aria-label="Theme Preference">
      <p>{`${themeMode}:${resolvedTheme}`}</p>
      <button type="button" onClick={() => setThemeMode("light")}>
        Use light theme
      </button>
    </section>
  );
}

describe("ThemeStateProvider", () => {
  beforeEach(() => {
    preferenceMocks.useThemePreference.mockReturnValue({
      setTheme: preferenceMocks.setTheme,
      theme: "dark",
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    preferenceMocks.setTheme.mockReset();
    preferenceMocks.useThemePreference.mockReset();
    vi.restoreAllMocks();
  });

  it("exposes the Theme Preference and applies the resolved dark appearance", () => {
    mockMatchMedia(true);

    renderWithProviders(
      <ThemeStateProvider>
        <ThemePreferenceProbe />
      </ThemeStateProvider>,
    );

    expect(screen.getByLabelText("Theme Preference")).toHaveTextContent("dark:dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("updates the resolved appearance when the system preference changes", () => {
    const media = mockMatchMedia(false);

    renderWithProviders(
      <ThemeStateProvider>
        <ThemePreferenceProbe />
      </ThemeStateProvider>,
    );

    expect(screen.getByLabelText("Theme Preference")).toHaveTextContent("dark:light");
    expect(document.documentElement).not.toHaveClass("dark");

    act(() => {
      media.setMatches(true);
    });

    expect(screen.getByLabelText("Theme Preference")).toHaveTextContent("dark:dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("writes Theme Preference changes through the User Preferences boundary", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);

    renderWithProviders(
      <ThemeStateProvider>
        <ThemePreferenceProbe />
      </ThemeStateProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Use light theme" }));

    expect(preferenceMocks.setTheme).toHaveBeenCalledWith("light");
  });
});
