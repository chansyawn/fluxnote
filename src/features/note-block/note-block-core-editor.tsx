import { CrepeBuilder } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";

import "./milkdown.css";

interface NoteBlockCoreEditorProps {
  initialMarkdown: string;
  editorKey: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
}

function NoteBlockMilkdown({
  initialMarkdown,
  editorKey,
  onBlur,
  onMarkdownUpdated,
}: NoteBlockCoreEditorProps) {
  useEditor(
    (root) =>
      new CrepeBuilder({
        root,
        defaultValue: initialMarkdown,
      }).on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          onMarkdownUpdated(markdown);
        });

        listener.blur(() => {
          onBlur?.();
        });
      }),
    [editorKey],
  );

  return <Milkdown />;
}

export function NoteBlockCoreEditor(props: NoteBlockCoreEditorProps) {
  return (
    <MilkdownProvider>
      <NoteBlockMilkdown {...props} />
    </MilkdownProvider>
  );
}
