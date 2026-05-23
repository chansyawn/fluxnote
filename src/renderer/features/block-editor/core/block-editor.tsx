import { HistoryExtension } from "@lexical/history";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { configExtension, defineExtension, type InitialEditorStateType } from "lexical";
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";

import { createClipboardDataFromDocument } from "../clipboard/clipboard-data";
import { ClipboardExtension } from "../clipboard/clipboard-extension";
import { SYNTAX_REACT_EXTENSIONS } from "../syntax/registry";
import {
  BLOCK_EDITOR_NAMESPACE,
  createBlockEditorCoreExtension,
} from "./block-editor-core-extension";
import { BlockEditorConfigProvider, resolveBlockEditorConfig } from "./config";
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
      className="relative resize-none text-sm outline-none"
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
  const runtime = useBlockEditorRuntime();

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);
        if (data === null) return;
        await runtime.clipboard.write(data);
      },
      flush: flushMarkdown,
      focus: () => editor.focus(),
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
    <div ref={setOverlayContainer} className="relative min-h-16 text-sm">
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
