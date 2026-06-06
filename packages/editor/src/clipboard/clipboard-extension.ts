import { defineExtension } from "lexical";
import { COMMAND_PRIORITY_CRITICAL, COPY_COMMAND, PASTE_COMMAND } from "lexical";

import { BlockEditorRuntimeExtension } from "../runtime/runtime-extension";
import {
  createClipboardDataFromSnapshot,
  createClipboardSnapshotFromCurrentSelection,
  writeClipboardSnapshotToDataTransfer,
} from "./copy";
import { handleBlockEditorPaste } from "./paste";
import { cloneCurrentSelection } from "./rich-text-paste";

export { createClipboardDataSnapshot } from "./paste";

export const ClipboardExtension = defineExtension({
  name: "fluxnotes/block-editor/clipboard",
  dependencies: [BlockEditorRuntimeExtension],
  register(editor, _config, state) {
    const runtime = state.getDependency(BlockEditorRuntimeExtension).config.runtime;
    const unregisterCopy = editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        const snapshot = createClipboardSnapshotFromCurrentSelection(editor);
        if (snapshot === null) {
          return false;
        }

        if (event instanceof ClipboardEvent && event.clipboardData !== null) {
          event.preventDefault();
          writeClipboardSnapshotToDataTransfer(event.clipboardData, snapshot);
        }

        void createClipboardDataFromSnapshot(snapshot, runtime.assets.resolve)
          .then((data) => runtime.clipboard.write(data))
          .catch(() => undefined);
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
