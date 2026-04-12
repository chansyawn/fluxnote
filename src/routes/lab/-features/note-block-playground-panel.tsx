import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { NoteBlockEditorView } from "@/features/note-block/note-block-editor-view";
import { Button } from "@/ui/components/button";

const DEFAULT_PLAYGROUND_MARKDOWN = `# Heading 1

## Heading 2
### Heading 3

This paragraph includes **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

> Blockquote with a [link](https://example.com).

---

## Lists

- Unordered item
- Nested list:
  - child item
  - another child item

1. Ordered item one
2. Ordered item two

## Task List

[x] Shipped Lexical migration
[ ] Add richer GFM support
[ ] Revisit single-document editor later

---

## Code Blocks

\`\`\`ts
type User = {
  id: string;
  name: string;
};

const demoUser: User = { id: "u_1", name: "FluxNote" };
console.log(demoUser);
\`\`\`

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Table

| Feature | Status | Notes |
| --- | --- | --- |
| Paragraphs | Ready | Stable core support |
| Task list | Ready | GFM syntax enabled |
| Tables | In progress | Markdown round-trip focused |
`;

export function NoteBlockPlaygroundPanel() {
  const [markdown, setMarkdown] = useState(DEFAULT_PLAYGROUND_MARKDOWN);
  const [editorVersion, setEditorVersion] = useState(0);

  return (
    <section className="flex flex-col gap-3">
      <div className="bg-card flex items-center justify-between gap-2 rounded-lg p-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">
            <Trans id="lab.playground.title">Note Block Editor Playground</Trans>
          </h2>
          <p className="text-muted-foreground text-xs">
            <Trans id="lab.playground.description">
              Frontend-only playground. Edit this preset markdown to verify note block behavior.
            </Trans>
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setMarkdown(DEFAULT_PLAYGROUND_MARKDOWN);
            setEditorVersion((prevVersion) => prevVersion + 1);
          }}
        >
          <Trans id="lab.playground.reset">Reset preset</Trans>
        </Button>
      </div>

      <NoteBlockEditorView
        key={editorVersion}
        blockId="playground-block"
        focusRequestKey={0}
        initialMarkdown={markdown}
        onBlur={() => {}}
        onFocus={() => {}}
        onMarkdownUpdated={(latestMarkdown) => {
          setMarkdown(latestMarkdown);
        }}
      />
    </section>
  );
}
