import { Trans } from "@lingui/react/macro";
import {
  defaultValueCtx,
  Editor,
  EditorStatus,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
} from "@milkdown/kit/core";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";

import "@milkdown/kit/prose/view/style/prosemirror.css";
import { highlight, highlightPluginConfig } from "@milkdown/plugin-highlight";
import { createParser } from "@milkdown/plugin-highlight/shiki";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { ProsemirrorAdapterProvider, usePluginViewFactory } from "@prosemirror-adapter/react";
import { withLineNumbers } from "prosemirror-highlight";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createHighlighter } from "shiki";

import { createBlockEditorClipboardData, serializeMarkdown } from "../clipboard/clipboard-data";
import { createSyntaxPlugins } from "../syntax";
import {
  CodeBlockControls,
  CodeBlockControlsStateStore,
  getShikiLanguage,
  SHIKI_CODE_LANGUAGES,
} from "../syntax/code";
import {
  BlockEditorToolbarStateStore,
  readToolbarState,
  runFormatCommand,
} from "../toolbar/editor-toolbar-state";
import type { BlockEditorToolbarState } from "../toolbar/types";
import { resolveBlockEditorConfig } from "./config";
import { resolveTextFormatShortcut } from "./text-format-shortcuts";
import type { BlockEditorProps } from "./types";

import "./milkdown-theme.css";

const FORMAT_INPUT_TYPES = new Set([
  "formatBold",
  "formatItalic",
  "formatStrikeThrough",
  "formatUnderline",
]);

const SHIKI_THEMES = ["vitesse-light", "vitesse-dark"] as const;

let shikiHighlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getShikiHighlighter() {
  shikiHighlighterPromise ??= createHighlighter({
    langs: SHIKI_CODE_LANGUAGES,
    themes: [...SHIKI_THEMES],
  });

  return shikiHighlighterPromise;
}

function resolveShikiTheme() {
  return document.documentElement.classList.contains("dark") ? SHIKI_THEMES[1] : SHIKI_THEMES[0];
}

export function BlockEditor({
  ref,
  runtime,
  initialMarkdown,
  config,
  onBlur,
  onMarkdownChange,
}: BlockEditorProps) {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <BlockEditorContent
          ref={ref}
          runtime={runtime}
          initialMarkdown={initialMarkdown}
          config={config}
          onBlur={onBlur}
          onMarkdownChange={onMarkdownChange}
        />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  );
}

function BlockEditorContent({
  ref,
  runtime,
  initialMarkdown,
  config,
  onBlur,
  onMarkdownChange,
}: BlockEditorProps) {
  const [initialMarkdownSnapshot] = useState(() => initialMarkdown);
  const [codeBlockControlsStateStore] = useState(() => new CodeBlockControlsStateStore());
  const [toolbarStateStore] = useState(() => new BlockEditorToolbarStateStore());
  const linkPluginViewFactory = usePluginViewFactory();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const latestMarkdownRef = useRef(initialMarkdownSnapshot);
  const [isEmpty, setIsEmpty] = useState(initialMarkdownSnapshot.trim().length === 0);

  const resolvedConfig = useMemo(() => resolveBlockEditorConfig(config), [config]);

  const publishMarkdown = useEffectEvent((markdown: string) => {
    latestMarkdownRef.current = markdown;
    setIsEmpty(markdown.trim().length === 0);
    onMarkdownChange(markdown);
  });

  const handleBlur = useEffectEvent(() => {
    onBlur?.();
  });

  const resolveShortcut = useEffectEvent((event: KeyboardEvent) =>
    resolveTextFormatShortcut(event, resolvedConfig.shortcuts.textFormats),
  );

  const publishToolbarState = useCallback(
    (nextState: BlockEditorToolbarState) => {
      toolbarStateStore.publish(nextState);
    },
    [toolbarStateStore],
  );

  const flushMarkdown = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || editor.status !== EditorStatus.Created) return latestMarkdownRef.current;

    const markdown = serializeMarkdown(editor);
    publishMarkdown(markdown);
    return markdown;
  }, [publishMarkdown]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        const editor = editorRef.current;
        if (!editor) return;
        await runtime.clipboard.write(await createBlockEditorClipboardData(editor, runtime));
      },
      focus: () => {
        editorRef.current?.action((ctx) => {
          ctx.get(editorViewCtx).focus();
        });
      },
      formatText: (format) => {
        const editor = editorRef.current;
        if (!editor) return;
        runFormatCommand(editor, format);
        publishToolbarState(readToolbarState(editor));
      },
      flush: flushMarkdown,
      getToolbarState: toolbarStateStore.getSnapshot,
      subscribeToolbarState: toolbarStateStore.subscribe,
    }),
    [flushMarkdown, publishToolbarState, runtime, toolbarStateStore],
  );

  const milkdown = useEditor(
    (root) => {
      const editor = Editor.make()
        .config(async (ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialMarkdownSnapshot);
          const parser = createParser(await getShikiHighlighter(), { theme: resolveShikiTheme() });
          ctx.set(highlightPluginConfig.key, {
            languageExtractor: (node) => getShikiLanguage(node.attrs.language),
            parser: withLineNumbers(parser),
          });
          ctx.update(editorViewOptionsCtx, (options) => ({
            ...options,
            attributes: {
              class: "block-editor__content",
              spellcheck: "true",
            },
            handleDOMEvents: {
              ...options.handleDOMEvents,
              beforeinput: (_view, event) => {
                const inputEvent = event as InputEvent;
                if (!FORMAT_INPUT_TYPES.has(inputEvent.inputType)) return false;

                event.preventDefault();
                event.stopPropagation();
                return true;
              },
            },
            handleKeyDown: (view, event) => {
              const resolution = resolveShortcut(event);
              if (resolution.type === "none") {
                return options.handleKeyDown?.(view, event) ?? false;
              }

              event.preventDefault();
              event.stopPropagation();

              if (event.repeat) {
                return true;
              }

              if (resolution.type === "configured") {
                runFormatCommand(editor, resolution.format);
                publishToolbarState(readToolbarState(editor));
              }

              return true;
            },
          }));
          const listenerManager = ctx.get(listenerCtx);
          listenerManager
            .markdownUpdated((_ctx, markdown) => {
              publishMarkdown(markdown);
            })
            .selectionUpdated(() => {
              publishToolbarState(readToolbarState(editor));
            })
            .focus(() => {
              publishToolbarState(readToolbarState(editor));
            })
            .blur(() => {
              void flushMarkdown().catch(() => undefined);
              handleBlur();
            })
            .destroy(() => {
              // TODO: Replace Milkdown's markdownUpdated debounce with a local cancellable update flow.
              listenerManager.listeners.markdownUpdated.length = 0;
            });
        })
        .use(commonmark)
        .use(gfm)
        .use(highlight)
        .use(
          createSyntaxPlugins({
            codeBlockControlsStateStore,
            linkPluginViewFactory,
            runtime,
          }),
        )
        .use(history)
        .use(listener)
        .use(clipboard);

      editorRef.current = editor;

      return editor;
    },
    [codeBlockControlsStateStore, initialMarkdownSnapshot, linkPluginViewFactory, runtime],
  );

  useEffect(() => {
    if (milkdown.loading) return;

    const editor = milkdown.get();
    if (!editor) return;

    publishToolbarState(readToolbarState(editor));
    latestMarkdownRef.current = serializeMarkdown(editor);
    setIsEmpty(latestMarkdownRef.current.trim().length === 0);
  }, [milkdown, publishToolbarState]);

  useEffect(
    () => () => {
      codeBlockControlsStateStore.destroy();
      editorRef.current = null;
    },
    [codeBlockControlsStateStore],
  );

  return (
    <div
      ref={rootRef}
      className="block-editor relative text-sm"
      data-code-line-numbers={String(resolvedConfig.markdown.codeBlock.showLineNumbers)}
    >
      <Milkdown />
      <CodeBlockControls rootRef={rootRef} runtime={runtime} store={codeBlockControlsStateStore} />
      {isEmpty ? (
        <div className="text-muted-foreground pointer-events-none absolute top-0 left-0">
          <Trans id="block-editor.placeholder">Write a block...</Trans>
        </div>
      ) : null}
    </div>
  );
}
