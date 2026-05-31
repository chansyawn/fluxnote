import { useLingui } from "@lingui/react";
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
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import {
  ProsemirrorAdapterProvider,
  useNodeViewFactory,
  usePluginViewFactory,
} from "@prosemirror-adapter/react";
import { useThemeState } from "@renderer/app/theme";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { serializeMarkdown } from "../clipboard/clipboard-data";
import { copyWholeBlock, createEditorClipboardPlugin } from "../clipboard/editor-clipboard";
import { createSyntaxPlugins } from "../syntax";
import { configureCodeHighlight } from "../syntax/code";
import type { LinkToolbarCommandResult } from "../syntax/link/link-model";
import {
  BlockEditorToolbarStateStore,
  readToolbarState,
  runToolbarCommand,
} from "../toolbar/editor-toolbar-state";
import type { BlockEditorToolbarState } from "../toolbar/types";
import { createBlockEditorPlaceholderPlugin } from "./block-editor-placeholder";
import { createBlockEditorShortcutPlugin } from "./block-editor-shortcuts";
import { resolveBlockEditorConfig } from "./config";
import { configureMilkdownKeymaps } from "./milkdown-keymaps";
import type { BlockEditorProps } from "./types";

import "./milkdown-theme.css";

const FORMAT_INPUT_TYPES = new Set([
  "formatBold",
  "formatItalic",
  "formatStrikeThrough",
  "formatUnderline",
]);
const toolbarStatePluginKey = new PluginKey("FLUXNOTES_TOOLBAR_STATE");

function createToolbarStatePlugin(
  editor: Editor,
  publishToolbarState: (nextState: BlockEditorToolbarState) => void,
) {
  return $prose(
    () =>
      new Plugin({
        key: toolbarStatePluginKey,
        view: () => ({
          update: () => {
            publishToolbarState(readToolbarState(editor));
          },
        }),
      }),
  );
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
  const { i18n } = useLingui();
  const [initialMarkdownSnapshot] = useState(() => initialMarkdown);
  const [toolbarStateStore] = useState(() => new BlockEditorToolbarStateStore());
  const codeBlockNodeViewFactory = useNodeViewFactory();
  const linkPluginViewFactory = usePluginViewFactory();
  const tablePluginViewFactory = usePluginViewFactory();
  const { resolvedTheme } = useThemeState();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const latestMarkdownRef = useRef(initialMarkdownSnapshot);

  const resolvedConfig = useMemo(() => resolveBlockEditorConfig(config), [config]);
  const placeholderText = i18n._({
    id: "block-editor.placeholder",
    message: "Write a block...",
  });

  const publishMarkdown = useEffectEvent((markdown: string) => {
    latestMarkdownRef.current = markdown;
    onMarkdownChange(markdown);
  });

  const handleBlur = useEffectEvent(() => {
    onBlur?.();
  });

  const handleLinkToolbarCommandResult = useEffectEvent((result: LinkToolbarCommandResult) => {
    if (result.type !== "empty") return;

    toast.info(
      i18n._({
        id: "block-editor.link.select-text",
        message: "Select text to add a link",
      }),
    );
  });

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
        await copyWholeBlock(editor, runtime);
      },
      focus: () => {
        editorRef.current?.action((ctx) => {
          ctx.get(editorViewCtx).focus();
        });
      },
      runToolbarCommand: (command) => {
        const editor = editorRef.current;
        if (!editor) return;
        const result = runToolbarCommand(editor, command);
        if (result) handleLinkToolbarCommandResult(result);
        publishToolbarState(readToolbarState(editor));
      },
      flush: flushMarkdown,
      getToolbarState: toolbarStateStore.getSnapshot,
      subscribeToolbarState: toolbarStateStore.subscribe,
    }),
    [
      flushMarkdown,
      handleLinkToolbarCommandResult,
      publishToolbarState,
      runtime,
      toolbarStateStore,
    ],
  );

  const milkdown = useEditor(
    (root) => {
      const editor = Editor.make();

      editor
        .config(async (ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialMarkdownSnapshot);
          await configureCodeHighlight(ctx, { theme: resolvedTheme });
          configureMilkdownKeymaps(ctx, resolvedConfig.shortcuts.editor);
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
        .use(
          createSyntaxPlugins({
            codeBlockNodeViewFactory,
            linkPluginViewFactory,
            tablePluginViewFactory,
            runtime,
          }),
        )
        .use(createEditorClipboardPlugin(runtime))
        .use(createBlockEditorPlaceholderPlugin(placeholderText))
        .use(createToolbarStatePlugin(editor, publishToolbarState))
        .use(
          createBlockEditorShortcutPlugin({
            onLinkToolbarCommandResult: handleLinkToolbarCommandResult,
            shortcuts: resolvedConfig.shortcuts.editor,
          }),
        )
        .use(history)
        .use(listener)
        .use(clipboard);

      editorRef.current = editor;

      return editor;
    },
    [
      codeBlockNodeViewFactory,
      initialMarkdownSnapshot,
      linkPluginViewFactory,
      placeholderText,
      resolvedConfig.shortcuts.editor,
      resolvedTheme,
      runtime,
      tablePluginViewFactory,
    ],
  );

  useEffect(() => {
    if (milkdown.loading) return;

    const editor = milkdown.get();
    if (!editor) return;

    publishToolbarState(readToolbarState(editor));
    latestMarkdownRef.current = serializeMarkdown(editor);
  }, [milkdown, publishToolbarState]);

  useEffect(
    () => () => {
      editorRef.current = null;
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      className="block-editor relative text-sm"
      data-code-line-numbers={String(resolvedConfig.markdown.codeBlock.showLineNumbers)}
    >
      <Milkdown />
    </div>
  );
}
