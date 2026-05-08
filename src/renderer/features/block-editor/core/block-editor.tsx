import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useCallback, useImperativeHandle, useMemo, useRef } from "react";

import {
  BlockEditorContent,
  createBlockEditorContentExtension,
  type BlockEditorContentHandle,
} from "./block-editor-content";
import type { MarkdownChangeHandle } from "./markdown-change-listener";
import { MarkdownChangePlugin } from "./markdown-change-plugin";
import type { BlockEditorProps } from "./types";

export function BlockEditor({
  ref,
  blockId,
  initialMarkdown,
  onBlur,
  onMarkdownChange,
}: BlockEditorProps) {
  // initialMarkdown is initial-only; prop changes do not re-import editor state.
  const initialMarkdownRef = useRef(initialMarkdown);
  const contentRef = useRef<BlockEditorContentHandle | null>(null);
  const markdownRef = useRef<MarkdownChangeHandle | null>(null);
  const extension = useMemo(
    () =>
      createBlockEditorContentExtension({
        blockId,
        initialMarkdown: initialMarkdownRef.current,
      }),
    [blockId],
  );

  const flush = useCallback(
    async () => markdownRef.current?.flush() ?? initialMarkdownRef.current,
    [],
  );

  const handleBlur = useCallback(() => {
    markdownRef.current?.flush();
    onBlur?.();
  }, [onBlur]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => await contentRef.current?.copy(),
      focus: () => contentRef.current?.focus(),
      flush,
    }),
    [flush],
  );

  return (
    <div className="block-editor">
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
        <MarkdownChangePlugin ref={markdownRef} onMarkdownChange={onMarkdownChange} />
        <BlockEditorContent ref={contentRef} blockId={blockId} onBlur={handleBlur} />
      </LexicalExtensionComposer>
    </div>
  );
}
