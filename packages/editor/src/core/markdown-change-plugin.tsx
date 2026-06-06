import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";

import { exportEditorStateToMarkdown } from "../document/markdown-editor-io";
import {
  registerMarkdownChangeListener,
  type MarkdownChangeHandle,
  type MarkdownChangeListener,
} from "./markdown-change-listener";

export interface MarkdownChangePluginProps {
  onMarkdownChange: (markdown: string) => void;
  ref?: Ref<MarkdownChangeHandle>;
}

export function MarkdownChangePlugin({ onMarkdownChange, ref }: MarkdownChangePluginProps): null {
  const [editor] = useLexicalComposerContext();
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  const listenerRef = useRef<MarkdownChangeListener | null>(null);

  useLayoutEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onMarkdownChange]);

  useImperativeHandle(
    ref,
    () => ({
      flush: () =>
        listenerRef.current?.flush() ?? exportEditorStateToMarkdown(editor.getEditorState()),
    }),
    [editor],
  );

  useLayoutEffect(() => {
    const listener = registerMarkdownChangeListener(editor, (markdown) =>
      onMarkdownChangeRef.current(markdown),
    );
    listenerRef.current = listener;

    return () => {
      listener.dispose();
      listenerRef.current = null;
    };
  }, [editor]);

  return null;
}
