import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { NoteBlockCoreEditor } from "@/features/note-block/note-block-core-editor";
import { Button } from "@/ui/components/button";

const DEFAULT_PLAYGROUND_MARKDOWN = `# Note Block Playground

## Headings
### H3 heading

This paragraph includes **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

> Blockquote with a [link](https://example.com) and an image:
>
> ![Sample image](https://picsum.photos/320/160)

---

## Lists

- Unordered item
- Nested list:
  - child item
  - another child item

1. Ordered item one
2. Ordered item two

- [x] Completed task
- [ ] Incomplete task

## Table (GFM)

| Syntax | Support | Notes |
| --- | --- | --- |
| CommonMark | Yes | Paragraph, list, quote |
| GFM | Yes | Table, task list, strike |
| LaTeX | Yes | Inline and block math |

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

## Math

Inline math: $E = mc^2$ and $a^2 + b^2 = c^2$.

$$
\\int_0^1 x^2 \\; dx = \\frac{1}{3}
$$
`;

export function NoteBlockPlaygroundPanel() {
  const [markdown, setMarkdown] = useState(DEFAULT_PLAYGROUND_MARKDOWN);
  const [editorVersion, setEditorVersion] = useState(0);
  const editorKey = `lab-note-block-playground-${editorVersion}`;

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

      <NoteBlockCoreEditor
        initialMarkdown={markdown}
        editorKey={editorKey}
        onMarkdownUpdated={(latestMarkdown) => {
          setMarkdown(latestMarkdown);
        }}
      />
    </section>
  );
}
