import type { Ctx } from "@milkdown/kit/ctx";
import {
  blockquoteKeymap,
  bulletListKeymap,
  codeBlockKeymap,
  emphasisKeymap,
  headingKeymap,
  inlineCodeKeymap,
  orderedListKeymap,
  paragraphKeymap,
  strongKeymap,
} from "@milkdown/kit/preset/commonmark";
import { strikethroughKeymap } from "@milkdown/kit/preset/gfm";
import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";

import type { BlockEditorShortcuts } from "./types";

const DISABLED_SHORTCUTS: string[] = [];

function toProseMirrorKeyName(shortcut: string): string {
  const parts = shortcut.split("+");
  const key = parts.at(-1);

  if (key && /^[A-Z]$/.test(key)) {
    return [...parts.slice(0, -1), key.toLowerCase()].join("-");
  }

  return parts.join("-");
}

function toMilkdownShortcut(shortcut: ShortcutBinding): string | string[] {
  return shortcut ? toProseMirrorKeyName(shortcut) : DISABLED_SHORTCUTS;
}

export function configureMilkdownKeymaps(ctx: Ctx, shortcuts: BlockEditorShortcuts): void {
  ctx.update(headingKeymap.key, (keymap) => ({
    ...keymap,
    TurnIntoH1: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading1"]),
    },
    TurnIntoH2: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading2"]),
    },
    TurnIntoH3: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading3"]),
    },
    TurnIntoH4: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading4"]),
    },
    TurnIntoH5: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading5"]),
    },
    TurnIntoH6: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.heading6"]),
    },
  }));

  ctx.set(blockquoteKeymap.key, {
    WrapInBlockquote: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.blockquote"]),
    },
  });

  ctx.set(bulletListKeymap.key, {
    WrapInBulletList: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(orderedListKeymap.key, {
    WrapInOrderedList: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(codeBlockKeymap.key, {
    CreateCodeBlock: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.codeBlock"]),
    },
  });

  ctx.set(paragraphKeymap.key, {
    TurnIntoText: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.paragraph"]),
    },
  });

  ctx.set(strongKeymap.key, {
    ToggleBold: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.bold"]),
    },
  });

  ctx.set(emphasisKeymap.key, {
    ToggleEmphasis: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.italic"]),
    },
  });

  ctx.set(inlineCodeKeymap.key, {
    ToggleInlineCode: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.inlineCode"]),
    },
  });

  ctx.set(strikethroughKeymap.key, {
    ToggleStrikethrough: {
      shortcuts: toMilkdownShortcut(shortcuts["editor.strikethrough"]),
    },
  });
}
