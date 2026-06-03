# Block Editor package boundary

`@fluxnotes/editor` is the Fluxnotes **Block Editor** package, not a generic Markdown editor package. It owns the editing surface, syntax behavior, toolbar, **Block Editor Shortcuts**, and pure **Block Asset** / clipboard models exposed through `@fluxnotes/editor/models`; the desktop app owns **Workspace** integration, IPC adapters, persisted **User Preferences**, theme state, and Lingui catalogs. This keeps reusable Block editing behavior in one package without forcing main-process code to import renderer-only React, Lexical UI, or CSS side effects.
