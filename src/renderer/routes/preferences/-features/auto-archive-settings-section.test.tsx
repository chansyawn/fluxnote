// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { SETTINGS_QUERY_KEY } from "@renderer/features/preferences/preferences-query";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsPatch,
} from "@shared/features/preferences/settings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

type SelectItem = {
  label: string;
  value: string;
};

type MockSelectProps = {
  children?: ReactNode;
  items?: SelectItem[];
  onValueChange?: (value: string | null) => void;
  value?: string | null;
};

type MockChildrenProps = {
  children?: ReactNode;
};

const clientMocks = vi.hoisted(() => ({
  deleteArchivedBlocks: vi.fn(),
  onPreferencesChanged: vi.fn(),
  patchSettings: vi.fn(),
  readSettings: vi.fn(),
  resetSettings: vi.fn(),
}));

const blockQueryMocks = vi.hoisted(() => ({
  refreshBlocks: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@renderer/clients", () => ({
  deleteArchivedBlocks: clientMocks.deleteArchivedBlocks,
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  patchSettings: clientMocks.patchSettings,
  readSettings: clientMocks.readSettings,
  resetSettings: clientMocks.resetSettings,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("@renderer/features/blocks/block-query", () => ({
  refreshBlocks: blockQueryMocks.refreshBlocks,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: MockChildrenProps) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@renderer/ui/components/select", async () => {
  const React = await import("react");

  return {
    Select: ({ items = [], onValueChange, value }: MockSelectProps) =>
      React.createElement(
        "select",
        {
          "data-testid": "auto-archive-unit",
          onChange: (event: { currentTarget: HTMLSelectElement }) => {
            onValueChange?.(event.currentTarget.value);
          },
          value: value ?? "",
        },
        items.map((item) =>
          React.createElement(
            "option",
            {
              key: item.value,
              value: item.value,
            },
            item.label,
          ),
        ),
      ),
    SelectContent: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    SelectGroup: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    SelectTrigger: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    SelectValue: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AutoArchiveSettingsSection } from "./auto-archive-settings-section";

i18n.load("en", {});
i18n.activate("en");

function createSettings(idleMinutes: number): Settings {
  return {
    ...DEFAULT_SETTINGS,
    autoArchive: {
      ...DEFAULT_SETTINGS.autoArchive,
      idleMinutes,
    },
  };
}

function setupSettingsMocks(initialSettings: Settings): { getSettings: () => Settings } {
  let settings = initialSettings;

  clientMocks.readSettings.mockImplementation(async () => settings);
  clientMocks.patchSettings.mockImplementation(async (patch: SettingsPatch) => {
    settings = {
      ...settings,
      autoArchive: {
        ...settings.autoArchive,
        ...patch.autoArchive,
      },
    };

    return settings;
  });

  return {
    getSettings: () => settings,
  };
}

type RenderedSection = {
  container: HTMLElement;
  queryClient: QueryClient;
  root: Root;
};

let renderedSection: RenderedSection | null = null;

function renderAutoArchiveSettingsSection(initialIdleMinutes: number): RenderedSection {
  const settingsController = setupSettingsMocks(createSettings(initialIdleMinutes));
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  queryClient.setQueryData(SETTINGS_QUERY_KEY, settingsController.getSettings());
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <I18nProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AutoArchiveSettingsSection />
        </QueryClientProvider>
      </I18nProvider>,
    );
  });

  const rendered = { container, queryClient, root };
  renderedSection = rendered;

  return rendered;
}

function getAmountInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[inputmode="numeric"]');
  if (!input) {
    throw new Error("Auto archive amount input was not rendered");
  }

  return input;
}

function getUnitSelect(container: HTMLElement): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>(
    'select[data-testid="auto-archive-unit"]',
  );
  if (!select) {
    throw new Error("Auto archive unit select was not rendered");
  }

  return select;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const valueSetter = Reflect.get(valueDescriptor ?? {}, "set") as
    | ((this: HTMLInputElement, value: string) => void)
    | undefined;
  if (!valueSetter) {
    throw new Error("HTMLInputElement value setter is unavailable");
  }

  Reflect.apply(valueSetter, input, [value]);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string): void {
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  const valueSetter = Reflect.get(valueDescriptor ?? {}, "set") as
    | ((this: HTMLSelectElement, value: string) => void)
    | undefined;
  if (!valueSetter) {
    throw new Error("HTMLSelectElement value setter is unavailable");
  }

  Reflect.apply(valueSetter, select, [value]);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function expectLastSettingsPatch(patch: SettingsPatch): void {
  const calls = clientMocks.patchSettings.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  expect(calls[calls.length - 1]?.[0]).toEqual(patch);
}

async function flushAsyncWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("AutoArchiveSettingsSection", () => {
  beforeEach(() => {
    clientMocks.deleteArchivedBlocks.mockResolvedValue({ deletedCount: 0 });
    clientMocks.onPreferencesChanged.mockReturnValue(() => undefined);
  });

  afterEach(() => {
    if (renderedSection) {
      act(() => {
        renderedSection?.root.unmount();
      });
      renderedSection.container.remove();
      renderedSection.queryClient.clear();
      renderedSection = null;
    }

    clientMocks.deleteArchivedBlocks.mockReset();
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.patchSettings.mockReset();
    clientMocks.readSettings.mockReset();
    clientMocks.resetSettings.mockReset();
    blockQueryMocks.refreshBlocks.mockReset();
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
  });

  it("saves amount on blur and preserves the selected unit", async () => {
    const { container } = renderAutoArchiveSettingsSection(125);
    const input = getAmountInput(container);
    const select = getUnitSelect(container);

    act(() => {
      input.focus();
      setInputValue(input, "60");
    });

    expect(clientMocks.patchSettings).not.toHaveBeenCalled();

    act(() => {
      input.blur();
    });
    await flushAsyncWork();

    expectLastSettingsPatch({
      autoArchive: { enabled: true, idleMinutes: 60 },
    });
    expect(input.value).toBe("60");
    expect(select.value).toBe("minutes");
  });

  it("shows the canonical unit when opened", () => {
    const { container } = renderAutoArchiveSettingsSection(60);

    expect(getAmountInput(container).value).toBe("1");
    expect(getUnitSelect(container).value).toBe("hours");
  });

  it("rejects non-digit amount edits", () => {
    const { container } = renderAutoArchiveSettingsSection(125);
    const input = getAmountInput(container);

    act(() => {
      input.focus();
      setInputValue(input, "1.5");
    });

    expect(input.value).toBe("125");
    expect(clientMocks.patchSettings).not.toHaveBeenCalled();
  });

  it("saves empty amount edits as the current unit minimum on blur", async () => {
    const { container } = renderAutoArchiveSettingsSection(125);
    const input = getAmountInput(container);

    act(() => {
      input.focus();
      setInputValue(input, "");
      input.blur();
    });
    await flushAsyncWork();

    expectLastSettingsPatch({
      autoArchive: { enabled: true, idleMinutes: 1 },
    });
    expect(input.value).toBe("1");
  });

  it("clamps amount edits to the current unit range on blur", async () => {
    const { container } = renderAutoArchiveSettingsSection(125);
    const input = getAmountInput(container);

    act(() => {
      input.focus();
      setInputValue(input, "999999");
      input.blur();
    });
    await flushAsyncWork();

    expectLastSettingsPatch({
      autoArchive: { enabled: true, idleMinutes: 20160 },
    });
    expect(input.value).toBe("20160");
  });

  it("keeps the amount when changing units", async () => {
    const { container } = renderAutoArchiveSettingsSection(125);
    const input = getAmountInput(container);
    const select = getUnitSelect(container);

    act(() => {
      setSelectValue(select, "hours");
    });
    await flushAsyncWork();

    expectLastSettingsPatch({
      autoArchive: { enabled: true, idleMinutes: 125 * 60 },
    });
    expect(input.value).toBe("125");
    expect(select.value).toBe("hours");
  });
});
