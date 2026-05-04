# Block Editor Architecture

`block-editor` is a renderer feature that provides a block-level Markdown editing surface on top of Lexical. It owns the Markdown parsing/export pipeline, Lexical runtime composition, and feature-local Markdown syntax modules.

This feature does not own block persistence, workspace state, or backend IPC. Those concerns live in the surrounding block and workspace features.

## Directory Shape

```text
src/renderer/features/block-editor/
  index.tsx                 # Public BlockEditor entry and LexicalComposer config
  block-editor-content.tsx  # Lexical plugin composition and change export
  core/                     # Markdown, mdast, Lexical conversion and registry
  syntax/                   # Feature-local Markdown syntax modules
  test-helper/             # Headless editor and snapshot test helpers
```

## Runtime Composition

`BlockEditor` is the public React entry point. It accepts a `blockId`, `initialMarkdown`, and change/blur callbacks, then creates a Lexical editor namespace and initial state.

`BlockEditorContent` mounts the editable surface and the shared Lexical plugins:

- rich text content editing
- undo/redo history
- syntax-contributed plugins
- live Markdown shortcut transformers
- `onChange` export back to Markdown

The editor reports content changes through `onMarkdownUpdated(markdown)`. It does not persist the Markdown itself.

## Core Layer

The `core/` directory keeps the conversion pipeline and extension registry separate from React UI code.

- `markdown-processor.ts` parses Markdown to mdast and stringifies mdast back to Markdown with unified/remark.
- `import-mdast-to-lexical.ts` imports mdast nodes into Lexical nodes through registered importers.
- `export-lexical-to-mdast.ts` exports Lexical nodes back into mdast through registered exporters.
- `syntax-registry.ts` aggregates all syntax module contributions into Lexical nodes, plugins, theme classes, importers, exporters, and Markdown transformers.
- `raw-markdown.ts` preserves source Markdown slices for nodes that are not rendered as rich editable content yet.

## Syntax Modules

Each folder under `syntax/` defines one `MarkdownSyntaxModule`. A module may contribute:

- Lexical node classes
- React plugins
- editor theme classes
- mdast importers
- Lexical exporters
- live Markdown shortcut transformers

This keeps Markdown support incremental: adding or changing a syntax usually means updating one syntax module and letting `syntax-registry.ts` compose it into the editor.

Unsupported rich-edit syntax is handled by the placeholders module. Placeholder nodes render the original Markdown as non-editable inline or block decorations and export it back unchanged where possible.

## Public Contracts

`BlockEditor` is the only public UI component exported by this feature.

```ts
interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
}
```

`MarkdownSyntaxModule` is the internal extension contract for Markdown syntax support. Its inputs are mdast nodes, Lexical nodes, and conversion contexts; its outputs are registry contributions consumed by the editor runtime.

## Testing Helpers

The `test-helper/` directory provides headless editor helpers for syntax tests. Tests can import Markdown, inspect serialized Lexical state, export mdast, and verify Markdown round trips without mounting the React editor.
