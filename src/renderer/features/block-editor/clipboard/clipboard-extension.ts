import { defineExtension } from "lexical";
import { COMMAND_PRIORITY_CRITICAL, COPY_COMMAND, PASTE_COMMAND } from "lexical";

import { BlockEditorRuntimeExtension } from "../core/runtime-extension";
import { createClipboardDataFromCurrentSelection } from "./clipboard-data";
import { cloneCurrentSelection } from "./clipboard-insert";
import { handleBlockEditorPaste } from "./paste-pipeline";

export { createClipboardDataSnapshot } from "./paste-pipeline";

export const ClipboardExtension = defineExtension({
  name: "fluxnotes/block-editor/clipboard",
  dependencies: [BlockEditorRuntimeExtension],
  register(editor, _config, state) {
    const runtime = state.getDependency(BlockEditorRuntimeExtension).config.runtime;
    const unregisterCopy = editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
        }

        void createClipboardDataFromCurrentSelection(editor, runtime.assets.resolve).then(
          (data) => {
            if (data !== null) {
              void runtime.clipboard.write(data);
            }
          },
        );
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => handleBlockEditorPaste(editor, runtime, event, cloneCurrentSelection()),
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      unregisterCopy();
      unregisterPaste();
    };
  },
});
