# Block Editor

`block-editor` is a Lexical-based Markdown block editor feature. It provides two-way conversion between editing state and Markdown text, and extends block/inline behavior through a syntax registration system.

## Development Goal

- Build a **WYSIWYG Markdown editor**.
- **Source fidelity is not required**. Semantic consistency is preferred over preserving the exact original Markdown source formatting.

## Directory Structure

```text
src/renderer/features/block-editor
├── index.tsx                         # BlockEditor entry, assembles LexicalComposer
├── block-editor-content.tsx          # Editor content and plugin mounting (OnChange/History/Shortcut)
├── editor-state.ts                   # Unified Markdown <-> EditorState conversion entry
├── types.ts                          # Public types: BlockEditorProps / BlockEditorHandle
├── index.css                         # Base editor styles
├── markdown/
│   ├── processor.ts                  # remark/unified parse and stringify
│   └── mdast-utils.ts                # mdast helper utilities
├── model/
│   ├── document.ts                   # SemanticDocument definitions (core domain model)
│   ├── normalize.ts                  # Semantic normalization
│   ├── mdast-adapter.ts              # mdast <-> SemanticDocument
│   ├── lexical-adapter.ts            # Lexical <-> SemanticDocument
│   ├── lexical-container.ts          # Container child to semantic block merge logic
│   └── index.ts
├── syntax/
│   ├── registration.ts               # Syntax registration types
│   ├── registry.ts                   # Syntax registry (nodes/transformers/plugins/theme)
│   └── <feature>/                    # Feature syntax modules (heading/list/code/link...)
└── test-helper/
    └── headless-editor-test-utils.ts # Headless editor test utilities
```

## Data Flow

```text
initialMarkdown
  -> parseMarkdownToMdast
  -> mdastToSemanticDocument
  -> importSemanticDocumentToLexical
  -> Lexical editing state

User edits in Lexical
  -> OnChangePlugin
  -> exportLexicalToSemanticDocument
  -> semanticDocumentToMdast
  -> stringifyMdastToMarkdown
  -> onMarkdownUpdated(markdown)
```
