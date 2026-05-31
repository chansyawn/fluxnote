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

import type { BlockEditorShortcuts } from "./types";

const DISABLED_SHORTCUTS: string[] = [];

export function configureMilkdownKeymaps(ctx: Ctx, _shortcuts: BlockEditorShortcuts): void {
  ctx.update(headingKeymap.key, (keymap) => ({
    ...keymap,
    TurnIntoH1: {
      shortcuts: DISABLED_SHORTCUTS,
    },
    TurnIntoH2: {
      shortcuts: DISABLED_SHORTCUTS,
    },
    TurnIntoH3: {
      shortcuts: DISABLED_SHORTCUTS,
    },
    TurnIntoH4: {
      shortcuts: DISABLED_SHORTCUTS,
    },
    TurnIntoH5: {
      shortcuts: DISABLED_SHORTCUTS,
    },
    TurnIntoH6: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  }));

  ctx.set(blockquoteKeymap.key, {
    WrapInBlockquote: {
      shortcuts: DISABLED_SHORTCUTS,
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
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(paragraphKeymap.key, {
    TurnIntoText: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(strongKeymap.key, {
    ToggleBold: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(emphasisKeymap.key, {
    ToggleEmphasis: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(inlineCodeKeymap.key, {
    ToggleInlineCode: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });

  ctx.set(strikethroughKeymap.key, {
    ToggleStrikethrough: {
      shortcuts: DISABLED_SHORTCUTS,
    },
  });
}
