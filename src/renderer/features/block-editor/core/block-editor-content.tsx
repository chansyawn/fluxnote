import { HistoryExtension } from "@lexical/history";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { configExtension, defineExtension, type InitialEditorStateType } from "lexical";
import { useImperativeHandle, type Ref } from "react";

import { createClipboardDataFromDocument } from "../clipboard/clipboard-data";
import { ClipboardExtension } from "../clipboard/clipboard-extension";
import { CODE_SYNTAX_REACT_EXTENSION } from "../syntax/code";
import { createBlockEditorCoreExtension } from "./block-editor-core-extension";
import { importMarkdownToEditor } from "./markdown-editor-io";
import { useBlockEditorRuntime } from "./runtime-context";
import { BlockEditorRuntimeExtension } from "./runtime-extension";
import type { BlockEditorHandle } from "./types";
import type { BlockEditorRuntime } from "./types";

export type BlockEditorContentHandle = Pick<BlockEditorHandle, "copy" | "focus">;

export interface BlockEditorContentExtensionConfig {
  initialMarkdown: string;
  namespace?: string;
  runtime: BlockEditorRuntime;
}

export function createInitialMarkdownEditorState(markdown: string): InitialEditorStateType {
  return (editor) => {
    importMarkdownToEditor(editor, markdown);
  };
}

export function createBlockEditorContentExtension(config: BlockEditorContentExtensionConfig) {
  return defineExtension({
    name: "fluxnotes/block-editor/content",
    namespace: config.namespace ?? "BlockEditor",
    $initialEditorState: createInitialMarkdownEditorState(config.initialMarkdown),
    dependencies: [
      configExtension(ReactExtension, { contentEditable: null }),
      configExtension(BlockEditorRuntimeExtension, { runtime: config.runtime }),
      CODE_SYNTAX_REACT_EXTENSION,
      createBlockEditorCoreExtension(config.namespace ?? "BlockEditor"),
      ClipboardExtension,
      HistoryExtension,
    ],
    onError(error) {
      throw error;
    },
  });
}

interface BlockEditorContentProps {
  onBlur?: () => void;
  ref?: Ref<BlockEditorContentHandle>;
}

export function BlockEditorContent({ onBlur, ref }: BlockEditorContentProps) {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();
  const runtime = useBlockEditorRuntime();

  useImperativeHandle(ref, () => ({
    copy: async () => {
      const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);
      if (data === null) {
        return;
      }

      await runtime.clipboard.write(data);
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
        placeholder={
          <div className="block-editor__placeholder">
            <Trans id="block-editor.placeholder">Write a note...</Trans>
          </div>
        }
        spellCheck
      />
    </div>
  );
}
