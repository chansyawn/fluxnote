import { linkSchema } from "@milkdown/kit/preset/commonmark";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import { runLinkToolbarCommand, type LinkToolbarCommandResult } from "../syntax/link/link-model";
import { runSetListBlockCommand, type ListBlockFormat } from "../syntax/list";
import type { BlockEditorShortcuts } from "./types";

const blockEditorShortcutPluginKey = new PluginKey("FLUXNOTES_BLOCK_EDITOR_SHORTCUTS");

type LinkToolbarCommandResultHandler = (result: LinkToolbarCommandResult) => void;

interface BlockEditorShortcutPluginInput {
  onLinkToolbarCommandResult: LinkToolbarCommandResultHandler;
  shortcuts: BlockEditorShortcuts;
}

export function createBlockEditorShortcutPlugin({
  onLinkToolbarCommandResult,
  shortcuts,
}: BlockEditorShortcutPluginInput) {
  return $prose(
    (ctx) =>
      new Plugin({
        key: blockEditorShortcutPluginKey,
        props: {
          handleKeyDown: (view, event) => {
            const listFormats: Array<{
              format: ListBlockFormat;
              shortcut: BlockEditorShortcuts[keyof BlockEditorShortcuts];
            }> = [
              { format: "bulletList", shortcut: shortcuts["editor.bulletList"] },
              { format: "orderedList", shortcut: shortcuts["editor.orderedList"] },
              { format: "taskList", shortcut: shortcuts["editor.taskList"] },
            ];

            for (const { format, shortcut } of listFormats) {
              if (!keyboardEventMatchesShortcut(event, shortcut)) continue;

              event.preventDefault();
              return runSetListBlockCommand(ctx, format);
            }

            if (!keyboardEventMatchesShortcut(event, shortcuts["editor.link"])) return false;

            event.preventDefault();
            onLinkToolbarCommandResult(runLinkToolbarCommand(view, linkSchema.type(ctx)));
            return true;
          },
        },
      }),
  );
}
