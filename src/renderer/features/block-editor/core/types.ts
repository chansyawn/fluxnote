import type { Ref } from "react";

export interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
  flush: () => Promise<string>;
}

export interface BlockEditorProps {
  ref?: Ref<BlockEditorHandle>;
  blockId: string;
  initialMarkdown: string;
  onMarkdownChange: (markdown: string) => void;
  onBlur?: () => void;
}
