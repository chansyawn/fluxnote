import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/extension";
import {
  type ElementTransformer,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";

import { NOTE_EDITOR_IMAGE_TRANSFORMER } from "@/features/note-editor-core/image/note-editor-image-markdown";
import { TABLE_TRANSFORMER } from "@/features/note-editor-core/table/note-editor-table-markdown";

const HORIZONTAL_RULE_REGEXP = /^(---|\*\*\*|___)\s?$/;

const HORIZONTAL_RULE_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "---" : null;
  },
  regExp: HORIZONTAL_RULE_REGEXP,
  replace: (parentNode, _children, _match, isImport) => {
    const lineNode = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(lineNode);
    } else {
      parentNode.insertBefore(lineNode);
    }

    lineNode.selectNext();
  },
  type: "element",
};

const NOTE_EDITOR_ELEMENT_TRANSFORMERS: Transformer[] = [
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  HORIZONTAL_RULE_TRANSFORMER,
];

const NOTE_EDITOR_MULTILINE_TRANSFORMERS: Transformer[] = [
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  TABLE_TRANSFORMER,
];

export const NOTE_EDITOR_MARKDOWN_TRANSFORMERS: Transformer[] = [
  ...NOTE_EDITOR_ELEMENT_TRANSFORMERS,
  ...NOTE_EDITOR_MULTILINE_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  NOTE_EDITOR_IMAGE_TRANSFORMER,
  ...TEXT_MATCH_TRANSFORMERS,
];
