import { HistoryExtension } from "@lexical/history";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { mergeRegister } from "@lexical/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  BEFORE_INPUT_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
  configExtension,
  defineExtension,
  type InitialEditorStateType,
} from "lexical";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import {
  blockEditorActionStatesEqual,
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  executeBlockEditorAction,
  readBlockEditorActionState,
  resolveBlockEditorShortcut,
  type BlockEditorActionId,
  type BlockEditorActionResult,
  type BlockEditorActionState,
  type BlockEditorActionStateListener,
} from "../actions";
import { ClipboardExtension } from "../clipboard/clipboard-extension";
import { createClipboardDataFromDocument } from "../clipboard/copy";
import { importMarkdownToEditor } from "../document/markdown-editor-io";
import { BlockEditorRuntimeExtension, useBlockEditorRuntime } from "../runtime/runtime-extension";
import type { BlockEditorRuntime } from "../runtime/types";
import { SYNTAX_REACT_EXTENSIONS } from "../syntax/registry";
import {
  BLOCK_EDITOR_NAMESPACE,
  createBlockEditorCoreExtension,
} from "./block-editor-core-extension";
import { useBlockEditorPreviewController } from "./block-editor-preview-controller";
import {
  BlockEditorConfigProvider,
  resolveBlockEditorConfig,
  useBlockEditorConfig,
} from "./config";
import { BlockEditorOverlayContainerProvider } from "./editor-overlay-container";
import type { MarkdownChangeHandle } from "./markdown-change-listener";
import { MarkdownChangePlugin } from "./markdown-change-plugin";
import type { BlockEditorProps } from "./types";

interface BlockEditorContentExtensionConfig {
  initialMarkdown: string;
  runtime: BlockEditorRuntime;
}

function createInitialMarkdownEditorState(markdown: string): InitialEditorStateType {
  return (editor) => {
    importMarkdownToEditor(editor, markdown);
  };
}

const LEXICAL_FORMAT_INPUT_TYPES = new Set([
  "formatBold",
  "formatItalic",
  "formatStrikeThrough",
  "formatUnderline",
]);

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
      configExtension(HistoryExtension, { maxDepth: 100 }),
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
  const { content } = useBlockEditorConfig();
  const defaultPlaceholder = i18n._({
    id: "block-editor.placeholder",
    message: "Write a block...",
  });
  const placeholder = content.placeholder ?? defaultPlaceholder;

  return (
    <ContentEditable
      aria-placeholder={placeholder}
      ariaLabel={i18n._({ id: "block-editor.content.label", message: "Markdown block editor" })}
      className="relative min-h-16 resize-none outline-none"
      onBlur={onBlur}
      placeholder={
        <div className="text-muted-foreground pointer-events-none absolute top-0 left-0">
          {content.placeholder ?? <Trans id="block-editor.placeholder">Write a block...</Trans>}
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
  const actionStateRef = useRef<BlockEditorActionState>(DEFAULT_BLOCK_EDITOR_ACTION_STATE);
  const actionStateListenersRef = useRef(new Set<BlockEditorActionStateListener>());
  const { getPreviewData, publishPreviewChange, subscribePreviewChange, syncPreviewSelection } =
    useBlockEditorPreviewController({
      editor,
      flushMarkdown,
      runtime,
    });

  const publishActionState = useCallback((nextState: BlockEditorActionState) => {
    if (blockEditorActionStatesEqual(actionStateRef.current, nextState)) {
      return;
    }

    actionStateRef.current = nextState;
    for (const listener of actionStateListenersRef.current) {
      listener(nextState);
    }
  }, []);

  const syncActionState = useCallback(() => {
    publishActionState(readBlockEditorActionState(editor));
  }, [editor, publishActionState]);

  const executeAction = useCallback(
    (action: BlockEditorActionId): BlockEditorActionResult => {
      const result = executeBlockEditorAction(action, { editor });
      syncActionState();
      return result;
    },
    [editor, syncActionState],
  );

  useEffect(() => {
    syncActionState();
    syncPreviewSelection();

    return mergeRegister(
      editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
        publishActionState(readBlockEditorActionState(editor));
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          publishPreviewChange();
        }
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          syncActionState();
          syncPreviewSelection();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, publishActionState, publishPreviewChange, syncActionState, syncPreviewSelection]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const shortcutResolution = resolveBlockEditorShortcut(event, shortcuts.actions);

          if (shortcutResolution.type === "none") {
            return false;
          }

          event.preventDefault();
          event.stopPropagation();

          if (event.repeat) {
            return true;
          }

          if (shortcutResolution.type === "blocked-default") {
            return true;
          }

          executeAction(shortcutResolution.action);
          return true;
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
  }, [editor, executeAction, shortcuts.actions]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);
        if (data === null) return;
        await runtime.clipboard.write(data);
      },
      executeAction,
      flush: flushMarkdown,
      focus: () => editor.focus(),
      getActionState: () => actionStateRef.current,
      getPreviewData,
      subscribeActionState: (listener: BlockEditorActionStateListener) => {
        actionStateListenersRef.current.add(listener);
        return () => {
          actionStateListenersRef.current.delete(listener);
        };
      },
      subscribePreviewChange,
    }),
    [editor, runtime, executeAction, flushMarkdown, getPreviewData, subscribePreviewChange],
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
    <div ref={setOverlayContainer} className="relative text-sm" data-block-editor-root>
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
