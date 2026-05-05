# Block Editor Architecture

`block-editor` is a Markdown-first WYSIWYG editor built on Lexical. Markdown and mdast are boundary formats only; the editor's stable internal contract is a normalized semantic document.

```text
Markdown string
  -> mdast
  -> normalized semantic document
  -> Lexical editor state
  -> normalized semantic document
  -> mdast
  -> canonical Markdown string
```

## Runtime Composition

`BlockEditor` owns the Lexical composer configuration and imports initial Markdown through the semantic pipeline. `BlockEditorContent` mounts the editable surface, history, the minimal Lexical plugins required for links/lists, Markdown shortcuts, and the change exporter.

Lexical is used for selection, composition, undo/redo, DOM reconciliation, keyboard behavior, and clipboard behavior. It does not define Markdown semantics.

## Core Layer

- `model/document.ts` defines the internal Markdown semantic document.
- `model/normalize.ts` keeps structural repair centralized.
- `markdown/processor.ts` parses Markdown to mdast and stringifies mdast to canonical Markdown.
- `markdown/mdast-utils.ts` contains mdast boundary helpers used by opaque placeholders.
- `semantic/mdast-adapter.ts` converts between mdast and semantic documents.
- `semantic/lexical-adapter.ts` projects semantic documents into Lexical and reads semantic documents back.
- `runtime/` lists Lexical nodes, theme classes, and required React plugins.
- `shortcuts.ts` contains live Markdown shortcuts only.
- `syntax/` is organized as light vertical slices, with explicit local entries and capability entries for mdast, Lexical, shortcuts, and nodes.

Unsupported syntax is represented by opaque inline/block placeholder nodes. Placeholders store `kind`, canonical `markdown`, and optional metadata; they do not store source offsets or original Markdown slices.

## Public Contract

`BlockEditor` is the only public UI component exported by this feature.

```ts
interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
}
```

## Testing

Tests should assert semantic document equality and canonical Markdown behavior. Lexical JSON is an implementation detail except for the minimal serialized placeholder fields.
