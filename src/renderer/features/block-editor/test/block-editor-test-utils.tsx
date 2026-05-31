import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, waitFor, type RenderResult } from "@testing-library/react";
import type { ComponentProps, ReactElement, ReactNode, Ref } from "react";
import { afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { BlockEditor } from "../core/block-editor";
import type { BlockEditorHandle, BlockEditorRuntime } from "../core/types";

type MockThemeMode = "light" | "dark" | "system";
type MockResolvedTheme = "light" | "dark";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const themeMocks = vi.hoisted(() => ({
  useThemeState: vi.fn(() => ({
    resolvedTheme: "light" as MockResolvedTheme,
    setThemeMode: vi.fn(),
    themeMode: "light" as MockThemeMode,
  })),
}));

vi.mock("@renderer/app/theme", () => ({
  useThemeState: themeMocks.useThemeState,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

i18n.load("en", {});
i18n.activate("en");

beforeAll(() => {
  document.elementFromPoint = () => document.activeElement;
  HTMLElement.prototype.getClientRects = function getClientRects() {
    return {
      0: this.getBoundingClientRect(),
      item: (index: number) => (index === 0 ? this.getBoundingClientRect() : null),
      length: 1,
      [Symbol.iterator]: function* iterateRects() {
        yield this[0];
      },
    } as DOMRectList;
  };
  Range.prototype.getClientRects = () =>
    ({
      0: new DOMRect(0, 0, 0, 0),
      item: (index: number) => (index === 0 ? new DOMRect(0, 0, 0, 0) : null),
      length: 1,
      [Symbol.iterator]: function* iterateRects() {
        yield this[0];
      },
    }) as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

beforeEach(() => {
  setMockResolvedTheme("light");
});

afterEach(() => {
  vi.useRealTimers();
});

export function setMockResolvedTheme(resolvedTheme: MockResolvedTheme) {
  themeMocks.useThemeState.mockReturnValue({
    resolvedTheme,
    setThemeMode: vi.fn(),
    themeMode: resolvedTheme,
  });
}

export function createBlockEditorRuntime(): BlockEditorRuntime {
  return {
    assets: {
      copy: vi.fn(async () => ({ assets: [] })),
      create: vi.fn(async () => ({ assets: [] })),
      resolve: vi.fn(async () => ({ assets: [] })),
    },
    clipboard: {
      write: vi.fn(async () => undefined),
      writeText: vi.fn(async () => undefined),
    },
    links: {
      openExternal: vi.fn(async () => undefined),
    },
  };
}

interface RenderBlockEditorResult extends RenderResult {
  runtime: BlockEditorRuntime;
}

export function renderBlockEditor(
  props: Partial<ComponentProps<typeof BlockEditor>> = {},
  ref?: Ref<BlockEditorHandle>,
): RenderBlockEditorResult {
  const runtime = props.runtime ?? createBlockEditorRuntime();
  const onMarkdownChange = props.onMarkdownChange ?? (() => undefined);

  const rendered = render(
    createBlockEditorElement(
      {
        ...props,
        initialMarkdown: props.initialMarkdown ?? "",
        onMarkdownChange,
        runtime,
      },
      ref,
    ),
    { wrapper: Providers },
  );

  return { runtime, ...rendered };
}

export function createBlockEditorElement(
  props: ComponentProps<typeof BlockEditor>,
  ref?: Ref<BlockEditorHandle>,
): ReactElement {
  return (
    <BlockEditor
      ref={ref}
      initialMarkdown={props.initialMarkdown}
      runtime={props.runtime}
      onMarkdownChange={props.onMarkdownChange}
      config={props.config}
      onBlur={props.onBlur}
    />
  );
}

function Providers({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

export async function findBlockEditor(container: HTMLElement): Promise<HTMLElement> {
  await waitFor(() => {
    expect(container.querySelector(".block-editor__content")).toBeInTheDocument();
  });

  return container.querySelector<HTMLElement>(".block-editor__content") as HTMLElement;
}
