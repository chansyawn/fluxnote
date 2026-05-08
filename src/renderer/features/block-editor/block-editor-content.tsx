import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useImperativeHandle, type Ref } from "react";

import { createClipboardDataFromDocument } from "./clipboard/clipboard-data";
import { writeBlockEditorClipboardData } from "./clipboard/clipboard-extension";
import type { BlockEditorHandle } from "./types";

interface BlockEditorContentProps {
  blockId: string;
  onBlur?: () => void;
  ref?: Ref<BlockEditorHandle>;
}

function Placeholder() {
  return (
    <div className="block-editor__placeholder">
      <Trans id="block-editor.placeholder">Write a note...</Trans>
    </div>
  );
}

export function BlockEditorContent({ blockId, onBlur, ref }: BlockEditorContentProps) {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(ref, () => ({
    copy: async () => {
      const data = await createClipboardDataFromDocument(editor, blockId);
      if (data === null) {
        return;
      }

      await writeBlockEditorClipboardData(data);
    },
    focus: () => {
      editor.focus();
    },
  }));

  return (
    <div className="block-editor__shell">
      <ContentEditable
        aria-placeholder={i18n._({
          id: "block-editor.placeholder",
          message: "Write a note...",
        })}
        ariaLabel={i18n._({
          id: "block-editor.content.label",
          message: "Markdown block editor",
        })}
        className="block-editor__content"
        onBlur={onBlur}
        placeholder={<Placeholder />}
        spellCheck
      />
    </div>
  );
}
