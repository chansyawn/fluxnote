import type { Transformer } from "@lexical/markdown";

import { CODE } from "../syntax/code/shortcut";
import { HEADING } from "../syntax/heading/shortcut";
import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "../syntax/inline-mark/shortcut";
import { LINK } from "../syntax/link/shortcut";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "../syntax/list/shortcut";
import { QUOTE } from "../syntax/quote/shortcut";
import { THEMATIC_BREAK } from "../syntax/thematic-break/shortcut";

export const markdownShortcutTransformers: Transformer[] = [
  HEADING,
  QUOTE,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  THEMATIC_BREAK,
  CODE,
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
  LINK,
];
