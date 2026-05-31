import { normalizeShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import {
  DEFAULT_USER_PREFERENCES,
  shortcutActionSchema,
} from "@shared/features/preferences/user-preferences";

import type {
  BlockEditorConfig,
  BlockEditorConfigInput,
  BlockEditorShortcutAction,
  BlockEditorShortcuts,
} from "./types";

function isBlockEditorShortcutAction(action: string): action is BlockEditorShortcutAction {
  return action.startsWith("editor.");
}

function createDefaultBlockEditorShortcuts(): BlockEditorShortcuts {
  const shortcuts = {} as BlockEditorShortcuts;
  const normalizedShortcuts = normalizeShortcutPreferences(DEFAULT_USER_PREFERENCES.shortcuts);

  for (const action of shortcutActionSchema.options) {
    if (isBlockEditorShortcutAction(action)) {
      shortcuts[action] = normalizedShortcuts[action];
    }
  }

  return shortcuts;
}

const defaultBlockEditorShortcuts = createDefaultBlockEditorShortcuts();

export function resolveBlockEditorConfig(config?: BlockEditorConfigInput): BlockEditorConfig {
  return {
    markdown: {
      codeBlock: {
        showLineNumbers:
          config?.markdown?.codeBlock?.showLineNumbers ??
          DEFAULT_USER_PREFERENCES.markdown.codeBlock.showLineNumbers,
      },
    },
    shortcuts: {
      editor: {
        ...defaultBlockEditorShortcuts,
        ...config?.shortcuts?.editor,
      },
    },
  };
}
