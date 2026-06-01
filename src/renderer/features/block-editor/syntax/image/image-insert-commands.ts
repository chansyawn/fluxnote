import { mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_HIGH, DRAGOVER_COMMAND, DROP_COMMAND, type LexicalEditor } from "lexical";

import { getSupportedImageFiles, hasSupportedImageData } from "../../assets/image-files";
import { insertImageFilesAtSelection } from "../../assets/image-insert";
import { cloneCurrentSelection } from "../../clipboard/rich-text-paste";
import type { BlockEditorRuntime } from "../../core/types";

export function registerImageInsertCommands(
  editor: LexicalEditor,
  runtime: BlockEditorRuntime,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      DRAGOVER_COMMAND,
      (event) => {
        if (!hasSupportedImageData(event.dataTransfer)) {
          return false;
        }

        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const files = getSupportedImageFiles(event.dataTransfer);
        if (files.length === 0) {
          return false;
        }

        const selection = cloneCurrentSelection();
        event.preventDefault();
        event.stopPropagation();
        void insertImageFilesAtSelection(editor, runtime, files, selection);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );
}
