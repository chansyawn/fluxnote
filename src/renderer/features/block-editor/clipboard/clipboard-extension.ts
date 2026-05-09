import { defineExtension } from "lexical";
import { COMMAND_PRIORITY_CRITICAL, COPY_COMMAND, PASTE_COMMAND } from "lexical";

import { UNAVAILABLE_BLOCK_EDITOR_RUNTIME } from "../core/runtime-defaults";
import type { BlockEditorRuntime } from "../core/types";
import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import { cloneCurrentSelection } from "./clipboard-insert";
import { handleBlockEditorPaste } from "./paste-pipeline";

export interface ClipboardExtensionConfig {
  runtime: BlockEditorRuntime;
}

export { createClipboardDataSnapshot } from "./paste-pipeline";

export const ClipboardExtension = defineExtension({
  name: "fluxnotes/block-editor/clipboard",
  config: {
    runtime: UNAVAILABLE_BLOCK_EDITOR_RUNTIME,
  } satisfies ClipboardExtensionConfig,
  register(editor, config) {
    const unregisterCopy = editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
        }

        void createClipboardDataFromCurrentSelection(editor, config.runtime.assets.resolve).then(
          (data) => {
            if (data !== null) {
              void config.runtime.clipboard.write(data);
            }
          },
        );
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => handleBlockEditorPaste(editor, config.runtime, event, cloneCurrentSelection()),
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      unregisterCopy();
      unregisterPaste();
    };
  },
});
