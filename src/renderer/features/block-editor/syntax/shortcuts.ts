import type { Transformer } from "@lexical/markdown";

import { CODE } from "./code";
import { HEADING } from "./heading";
import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "./inline-mark";
import { LINK } from "./link";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "./list";
import { QUOTE } from "./quote";
import { THEMATIC_BREAK } from "./thematic-break";

export const markdownShortcuts: Transformer[] = [
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
