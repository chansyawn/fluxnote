import "./index.css";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useEffect, useMemo, useRef } from "react";

import { BlockEditorContent } from "./block-editor-content";
import { createBlockEditorContentExtension } from "./block-editor-content-extension";
import type { BlockEditorProps } from "./types";
export type { BlockEditorHandle, BlockEditorProps } from "./types";

export function BlockEditor({
  ref,
  blockId,
  initialMarkdown,
  onBlur,
  onMarkdownUpdated,
}: BlockEditorProps) {
  // initialMarkdown is initial-only; prop changes do not re-import editor state.
  const initialMarkdownRef = useRef(initialMarkdown);
  const onMarkdownUpdatedRef = useRef(onMarkdownUpdated);
  useEffect(() => {
    onMarkdownUpdatedRef.current = onMarkdownUpdated;
  }, [onMarkdownUpdated]);
  const extension = useMemo(
    () =>
      createBlockEditorContentExtension({
        blockId,
        initialMarkdown: initialMarkdownRef.current,
        onMarkdownUpdated: (markdown) => onMarkdownUpdatedRef.current(markdown),
      }),
    [blockId],
  );

  return (
    <div className="block-editor">
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
        <BlockEditorContent ref={ref} blockId={blockId} onBlur={onBlur} />
      </LexicalExtensionComposer>
    </div>
  );
}
