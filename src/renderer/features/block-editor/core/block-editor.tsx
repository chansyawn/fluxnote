import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  commandsCtx,
  defaultValueCtx,
  Editor,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/kit/core";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";

import "@milkdown/kit/prose/view/style/prosemirror.css";
import {
  commonmark,
  emphasisSchema,
  inlineCodeSchema,
  strongSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
} from "@milkdown/kit/preset/commonmark";
import { gfm, strikethroughSchema, toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import type { MarkType } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";
import { getHTML } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { collectImageAssetUrls } from "@shared/features/block-editor/asset-urls";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { normalizeExternalMarkdown } from "../markdown/external-markdown";
import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorTextFormat,
  type BlockEditorToolbarState,
  type BlockEditorToolbarStateListener,
} from "../toolbar/types";
import { resolveBlockEditorConfig } from "./config";
import { resolveTextFormatShortcut } from "./text-format-shortcuts";
import type { BlockEditorConfig, BlockEditorProps, BlockEditorRuntime } from "./types";

import "./milkdown-theme.css";

const FORMAT_INPUT_TYPES = new Set([
  "formatBold",
  "formatItalic",
  "formatStrikeThrough",
  "formatUnderline",
]);

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(assets:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;

function collectMarkdownAssetUrls(markdown: string): string[] {
  return collectImageAssetUrls(
    [...markdown.matchAll(IMAGE_MARKDOWN_PATTERN)].map((match) => ({
      type: "image",
      url: match[1],
    })),
  );
}

function rewriteHtmlAssetUrls(html: string, assetUrlMap: Map<string, string>): string {
  let nextHtml = html;

  for (const [assetUrl, fileUrl] of assetUrlMap) {
    nextHtml = nextHtml.replaceAll(assetUrl, fileUrl);
  }

  return nextHtml;
}

function getImageFileUrlForNativeClipboard(
  markdown: string,
  assetUrlMap: Map<string, string>,
): string | undefined {
  const assetUrls = collectMarkdownAssetUrls(markdown);
  if (assetUrls.length !== 1) return undefined;
  return assetUrlMap.get(assetUrls[0]);
}

function readMarkState(view: EditorView, markType: MarkType): boolean {
  const { doc, selection, storedMarks } = view.state;
  const { empty, from, to, $from } = selection;

  if (empty) {
    return (
      Boolean(storedMarks?.some((mark) => mark.type === markType)) ||
      markType.isInSet($from.marks()) !== undefined
    );
  }

  return doc.rangeHasMark(from, to, markType);
}

function toolbarStatesEqual(
  left: BlockEditorToolbarState,
  right: BlockEditorToolbarState,
): boolean {
  return (
    left.textFormats.bold === right.textFormats.bold &&
    left.textFormats.code === right.textFormats.code &&
    left.textFormats.italic === right.textFormats.italic &&
    left.textFormats.strikethrough === right.textFormats.strikethrough
  );
}

function readToolbarState(editor: Editor): BlockEditorToolbarState {
  return editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);

    return {
      textFormats: {
        bold: readMarkState(view, strongSchema.type(ctx)),
        code: readMarkState(view, inlineCodeSchema.type(ctx)),
        italic: readMarkState(view, emphasisSchema.type(ctx)),
        strikethrough: readMarkState(view, strikethroughSchema.type(ctx)),
      },
    };
  });
}

function runFormatCommand(editor: Editor, format: BlockEditorTextFormat): void {
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    const command = {
      bold: toggleStrongCommand.key,
      code: toggleInlineCodeCommand.key,
      italic: toggleEmphasisCommand.key,
      strikethrough: toggleStrikethroughCommand.key,
    }[format];

    commands.call(command);
  });
}

function serializeMarkdown(editor: Editor): string {
  return editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const serializer = ctx.get(serializerCtx);
    return serializer(view.state.doc);
  });
}

async function createClipboardData(editor: Editor, runtime: BlockEditorRuntime) {
  const markdown = normalizeExternalMarkdown(serializeMarkdown(editor));
  const html = editor.action(getHTML());
  const assetUrls = collectMarkdownAssetUrls(markdown);
  const resolvedAssets =
    assetUrls.length > 0 ? await runtime.assets.resolve({ assetUrls }) : { assets: [] };
  const assetUrlMap = new Map(
    resolvedAssets.assets.map((asset) => [asset.assetUrl, asset.fileUrl] as const),
  );
  const imageFileUrl = getImageFileUrlForNativeClipboard(markdown, assetUrlMap);

  return {
    html: rewriteHtmlAssetUrls(html, assetUrlMap),
    ...(imageFileUrl ? { imageFileUrl } : {}),
    nodes: assetUrls.map((assetUrl) => ({ type: "image", url: assetUrl })),
    text: markdown,
  };
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
      <BlockEditorContent
        ref={ref}
        runtime={runtime}
        initialMarkdown={initialMarkdown}
        config={config}
        onBlur={onBlur}
        onMarkdownChange={onMarkdownChange}
      />
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
  const editorRef = useRef<Editor | null>(null);
  const latestMarkdownRef = useRef(initialMarkdown);
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  const onBlurRef = useRef(onBlur);
  const configRef = useRef<BlockEditorConfig>(resolveBlockEditorConfig(config));
  const toolbarStateRef = useRef<BlockEditorToolbarState>(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
  const toolbarStateListenersRef = useRef(new Set<BlockEditorToolbarStateListener>());
  const [isEmpty, setIsEmpty] = useState(initialMarkdown.trim().length === 0);

  const resolvedConfig = useMemo(() => resolveBlockEditorConfig(config), [config]);

  useEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onMarkdownChange]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    configRef.current = resolvedConfig;
  }, [resolvedConfig]);

  const publishToolbarState = useCallback((nextState: BlockEditorToolbarState) => {
    if (toolbarStatesEqual(toolbarStateRef.current, nextState)) {
      return;
    }

    toolbarStateRef.current = nextState;
    for (const listener of toolbarStateListenersRef.current) {
      listener(nextState);
    }
  }, []);

  const flushMarkdown = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return latestMarkdownRef.current;

    const markdown = serializeMarkdown(editor);
    latestMarkdownRef.current = markdown;
    setIsEmpty(markdown.trim().length === 0);
    onMarkdownChangeRef.current(markdown);
    return markdown;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        const editor = editorRef.current;
        if (!editor) return;
        await runtime.clipboard.write(await createClipboardData(editor, runtime));
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
      getToolbarState: () => toolbarStateRef.current,
      subscribeToolbarState: (listener) => {
        toolbarStateListenersRef.current.add(listener);
        return () => {
          toolbarStateListenersRef.current.delete(listener);
        };
      },
    }),
    [flushMarkdown, publishToolbarState, runtime],
  );

  const milkdown = useEditor(
    (root) => {
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialMarkdown);
          ctx.update(editorViewOptionsCtx, (options) => ({
            ...options,
            attributes: {
              "aria-label": i18n._({
                id: "block-editor.content.label",
                message: "Markdown block editor",
              }),
              "aria-multiline": "true",
              class: "block-editor__content",
              role: "textbox",
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
              const resolution = resolveTextFormatShortcut(
                event,
                configRef.current.shortcuts.textFormats,
              );
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
          ctx
            .get(listenerCtx)
            .markdownUpdated((_ctx, markdown) => {
              latestMarkdownRef.current = markdown;
              setIsEmpty(markdown.trim().length === 0);
              onMarkdownChangeRef.current(markdown);
            })
            .selectionUpdated(() => {
              publishToolbarState(readToolbarState(editor));
            })
            .focus(() => {
              publishToolbarState(readToolbarState(editor));
            })
            .blur(() => {
              void flushMarkdown();
              onBlurRef.current?.();
            });
        })
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .use(clipboard);

      editorRef.current = editor;

      return editor;
    },
    [flushMarkdown, i18n, initialMarkdown, publishToolbarState],
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
      editorRef.current = null;
    },
    [],
  );

  return (
    <div
      className="block-editor relative text-sm"
      data-code-line-numbers={String(resolvedConfig.markdown.codeBlock.showLineNumbers)}
    >
      <Milkdown />
      {isEmpty ? (
        <div className="text-muted-foreground pointer-events-none absolute top-0 left-0">
          <Trans id="block-editor.placeholder">Write a block...</Trans>
        </div>
      ) : null}
    </div>
  );
}
