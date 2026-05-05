import type { Ref } from "react";

export interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
}

export interface BlockEditorProps {
  ref?: Ref<BlockEditorHandle>;
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
}
