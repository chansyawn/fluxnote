import { useImperativeHandle } from "react";

export interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
}

interface BlockEditorProps {
  ref?: React.Ref<BlockEditorHandle>;
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
}

export function BlockEditor({ ref }: BlockEditorProps) {
  useImperativeHandle(ref, () => ({
    copy: async () => {},
    focus: () => {},
  }));

  return <div className="block-editor min-h-16" />;
}
