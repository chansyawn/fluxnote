import { HistoryExtension } from "@lexical/history";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { mergeRegister } from "@lexical/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";
import {
  $getSelection,
  $isRangeSelection,
  BEFORE_INPUT_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
  configExtension,
  defineExtension,
  type InitialEditorStateType,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { createClipboardDataFromDocument } from "../clipboard/clipboard-data";
import { ClipboardExtension } from "../clipboard/clipboard-extension";
import { SYNTAX_REACT_EXTENSIONS } from "../syntax/registry";
import {
  BLOCK_EDITOR_TEXT_FORMATS,
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorTextFormat,
  type BlockEditorTextFormatShortcuts,
  type BlockEditorToolbarState,
  type BlockEditorToolbarStateListener,
} from "../toolbar/types";
import {
  BLOCK_EDITOR_NAMESPACE,
  createBlockEditorCoreExtension,
} from "./block-editor-core-extension";
import {
  BlockEditorConfigProvider,
  resolveBlockEditorConfig,
  useBlockEditorConfig,
} from "./config";
import { BlockEditorOverlayContainerProvider } from "./editor-overlay-container";
import type { MarkdownChangeHandle } from "./markdown-change-listener";
import { MarkdownChangePlugin } from "./markdown-change-plugin";
import { importMarkdownToEditor } from "./markdown-editor-io";
import { BlockEditorRuntimeExtension, useBlockEditorRuntime } from "./runtime-extension";
import type { BlockEditorProps, BlockEditorRuntime } from "./types";

interface BlockEditorContentExtensionConfig {
  initialMarkdown: string;
  runtime: BlockEditorRuntime;
}

function createInitialMarkdownEditorState(markdown: string): InitialEditorStateType {
  return (editor) => {
    importMarkdownToEditor(editor, markdown);
  };
}

function readToolbarStateFromSelection(): BlockEditorToolbarState {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE;
  }

  return {
    textFormats: {
      bold: selection.hasFormat("bold"),
      code: selection.hasFormat("code"),
      italic: selection.hasFormat("italic"),
      strikethrough: selection.hasFormat("strikethrough"),
    },
  };
}

function readToolbarState(editor: LexicalEditor): BlockEditorToolbarState {
  let state = DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE;
  editor.getEditorState().read(() => {
    state = readToolbarStateFromSelection();
  });
  return state;
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

const LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
} as const;

const LEXICAL_FORMAT_INPUT_TYPES = new Set([
  "formatBold",
  "formatItalic",
  "formatStrikeThrough",
  "formatUnderline",
]);

function getConfiguredTextFormatShortcut(
  event: KeyboardEvent,
  shortcuts: BlockEditorTextFormatShortcuts,
): BlockEditorTextFormat | null {
  for (const format of BLOCK_EDITOR_TEXT_FORMATS) {
    const shortcut = shortcuts[format] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return format;
    }
  }

  return null;
}

function isLexicalDefaultTextFormatShortcut(event: KeyboardEvent): boolean {
  return Object.values(LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS).some((shortcut) =>
    keyboardEventMatchesShortcut(event, shortcut),
  );
}

function isLexicalTextFormatInput(event: InputEvent): boolean {
  return LEXICAL_FORMAT_INPUT_TYPES.has(event.inputType);
}

function createBlockEditorContentExtension(config: BlockEditorContentExtensionConfig) {
  return defineExtension({
    $initialEditorState: createInitialMarkdownEditorState(config.initialMarkdown),
    dependencies: [
      configExtension(ReactExtension, { contentEditable: null }),
      configExtension(BlockEditorRuntimeExtension, { runtime: config.runtime }),
      ...SYNTAX_REACT_EXTENSIONS,
      createBlockEditorCoreExtension(),
      ClipboardExtension,
      HistoryExtension,
    ],
    name: "fluxnotes/block-editor/content",
    namespace: BLOCK_EDITOR_NAMESPACE,
    onError(error) {
      throw error;
    },
  });
}

interface BlockEditorContentProps {
  onBlur?: () => void;
}

function BlockEditorContent({ onBlur }: BlockEditorContentProps) {
  const { i18n } = useLingui();

  return (
    <ContentEditable
      aria-placeholder={i18n._({ id: "block-editor.placeholder", message: "Write a note..." })}
      ariaLabel={i18n._({ id: "block-editor.content.label", message: "Markdown block editor" })}
      className="relative min-h-16 resize-none outline-none"
      onBlur={onBlur}
      placeholder={
        <div className="text-muted-foreground pointer-events-none absolute top-0 left-0">
          <Trans id="block-editor.placeholder">Write a note...</Trans>
        </div>
      }
      spellCheck
    />
  );
}

interface BlockEditorImperativeProps {
  ref: BlockEditorProps["ref"];
  onBlur?: () => void;
  flushMarkdown: () => Promise<string>;
}

function BlockEditorImperative({ ref, onBlur, flushMarkdown }: BlockEditorImperativeProps) {
  const [editor] = useLexicalComposerContext();
  const { shortcuts } = useBlockEditorConfig();
  const runtime = useBlockEditorRuntime();
  const toolbarStateRef = useRef<BlockEditorToolbarState>(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
  const toolbarStateListenersRef = useRef(new Set<BlockEditorToolbarStateListener>());

  const publishToolbarState = useCallback((nextState: BlockEditorToolbarState) => {
    if (toolbarStatesEqual(toolbarStateRef.current, nextState)) {
      return;
    }

    toolbarStateRef.current = nextState;
    for (const listener of toolbarStateListenersRef.current) {
      listener(nextState);
    }
  }, []);

  const syncToolbarState = useCallback(() => {
    publishToolbarState(readToolbarState(editor));
  }, [editor, publishToolbarState]);

  useEffect(() => {
    syncToolbarState();

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          publishToolbarState(readToolbarStateFromSelection());
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          syncToolbarState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, publishToolbarState, syncToolbarState]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          if (event.repeat) {
            return false;
          }

          const configuredFormat = getConfiguredTextFormatShortcut(event, shortcuts.textFormats);
          if (configuredFormat) {
            event.preventDefault();
            event.stopPropagation();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, configuredFormat);
            return true;
          }

          if (isLexicalDefaultTextFormatShortcut(event)) {
            event.preventDefault();
            event.stopPropagation();
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        BEFORE_INPUT_COMMAND,
        (event) => {
          if (!isLexicalTextFormatInput(event)) {
            return false;
          }

          event.preventDefault();
          event.stopPropagation();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, shortcuts.textFormats]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);
        if (data === null) return;
        await runtime.clipboard.write(data);
      },
      formatText: (format: BlockEditorTextFormat) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      },
      flush: flushMarkdown,
      focus: () => editor.focus(),
      getToolbarState: () => toolbarStateRef.current,
      subscribeToolbarState: (listener: BlockEditorToolbarStateListener) => {
        toolbarStateListenersRef.current.add(listener);
        return () => {
          toolbarStateListenersRef.current.delete(listener);
        };
      },
    }),
    [editor, runtime, flushMarkdown],
  );

  return <BlockEditorContent onBlur={onBlur} />;
}

export function BlockEditor({
  ref,
  runtime,
  initialMarkdown,
  config,
  onBlur,
  onMarkdownChange,
}: BlockEditorProps) {
  // initialMarkdown is initial-only; prop changes do not re-import editor state.
  const initialMarkdownRef = useRef(initialMarkdown);
  const markdownRef = useRef<MarkdownChangeHandle | null>(null);

  const extension = useMemo(
    () =>
      createBlockEditorContentExtension({ initialMarkdown: initialMarkdownRef.current, runtime }),
    [runtime],
  );

  const flushMarkdown = useCallback(
    async () => markdownRef.current?.flush() ?? initialMarkdownRef.current,
    [],
  );
  const resolvedConfig = useMemo(() => resolveBlockEditorConfig(config), [config]);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);

  const handleBlur = useCallback(() => {
    markdownRef.current?.flush();
    onBlur?.();
  }, [onBlur]);

  return (
    <div ref={setOverlayContainer} className="relative text-sm">
      <BlockEditorOverlayContainerProvider container={overlayContainer}>
        <BlockEditorConfigProvider config={resolvedConfig}>
          <LexicalExtensionComposer extension={extension} contentEditable={null}>
            <MarkdownChangePlugin ref={markdownRef} onMarkdownChange={onMarkdownChange} />
            <BlockEditorImperative ref={ref} onBlur={handleBlur} flushMarkdown={flushMarkdown} />
          </LexicalExtensionComposer>
        </BlockEditorConfigProvider>
      </BlockEditorOverlayContainerProvider>
    </div>
  );
}
