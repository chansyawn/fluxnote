import type { EditorThemeClasses } from "lexical";

export const blockEditorTheme: EditorThemeClasses = {
  code: "block-editor__code",
  heading: {
    h1: "block-editor__heading block-editor__heading--h1",
    h2: "block-editor__heading block-editor__heading--h2",
    h3: "block-editor__heading block-editor__heading--h3",
    h4: "block-editor__heading block-editor__heading--h4",
    h5: "block-editor__heading block-editor__heading--h5",
    h6: "block-editor__heading block-editor__heading--h6",
  },
  hr: "block-editor__horizontal-rule",
  link: "block-editor__link",
  list: {
    listitem: "block-editor__list-item",
    listitemChecked: "block-editor__list-item block-editor__list-item--checked",
    listitemUnchecked: "block-editor__list-item block-editor__list-item--unchecked",
    nested: {
      listitem: "block-editor__list-item block-editor__list-item--nested",
    },
    ol: "block-editor__list block-editor__list--ordered",
    ul: "block-editor__list block-editor__list--unordered",
    ulDepth: [
      "block-editor__list--unordered-depth-disc",
      "block-editor__list--unordered-depth-circle",
      "block-editor__list--unordered-depth-square",
    ],
  },
  paragraph: "block-editor__paragraph",
  quote: "block-editor__quote",
  text: {
    bold: "block-editor__text--strong",
    code: "block-editor__inline-code",
    italic: "block-editor__text--emphasis",
    strikethrough: "block-editor__text--strikethrough",
  },
};
