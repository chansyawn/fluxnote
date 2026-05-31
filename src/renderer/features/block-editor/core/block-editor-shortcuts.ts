import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import type { LinkToolbarCommandResult } from "../syntax/link/link-model";
import { runToolbarCommandWithContext } from "../toolbar/editor-toolbar-state";
import {
  BLOCK_EDITOR_BLOCK_FORMATS,
  BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS,
  BLOCK_EDITOR_INLINE_FORMATS,
  type BlockEditorToolbarCommand,
  type BlockEditorToolbarFormat,
} from "../toolbar/types";
import type { BlockEditorShortcuts } from "./types";

const blockEditorShortcutPluginKey = new PluginKey("FLUXNOTES_BLOCK_EDITOR_SHORTCUTS");

type LinkToolbarCommandResultHandler = (result: LinkToolbarCommandResult) => void;

const shortcutFormats: BlockEditorToolbarFormat[] = [
  ...BLOCK_EDITOR_BLOCK_FORMATS,
  ...BLOCK_EDITOR_INLINE_FORMATS,
];

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
          handleKeyDown: (_view, event) => {
            for (const format of shortcutFormats) {
              const action = BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS[format];
              const shortcut = shortcuts[action];
              if (!keyboardEventMatchesShortcut(event, shortcut)) continue;

              event.preventDefault();
              const command: BlockEditorToolbarCommand = BLOCK_EDITOR_BLOCK_FORMATS.includes(
                format as (typeof BLOCK_EDITOR_BLOCK_FORMATS)[number],
              )
                ? {
                    format: format as (typeof BLOCK_EDITOR_BLOCK_FORMATS)[number],
                    type: "set-block",
                  }
                : {
                    format: format as (typeof BLOCK_EDITOR_INLINE_FORMATS)[number],
                    type: "toggle-inline",
                  };
              const result = runToolbarCommandWithContext(ctx, command);
              if (result) onLinkToolbarCommandResult(result);
              return true;
            }

            return false;
          },
        },
      }),
  );
}
