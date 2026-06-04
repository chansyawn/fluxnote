import {
  BlockEditor,
  type BlockEditorConfigInput,
  type BlockEditorHandle,
  BlockEditorToolbar,
  BLOCK_EDITOR_SHORTCUT_DEFAULTS,
} from "@fluxnotes/editor";
import { Button } from "@fluxnotes/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fluxnotes/ui/components/select";
import { Switch } from "@fluxnotes/ui/components/switch";
import { cn } from "@fluxnotes/ui/lib/utils";
import { MoonIcon, RotateCcwIcon, SunIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { PlaygroundPreview } from "./playground-preview";
import { createPlaygroundBlockEditorRuntime } from "./playground-runtime";

type PlaygroundTheme = "dark" | "light";

interface PlaygroundSample {
  id: string;
  label: string;
  markdown: string;
}

const PLAYGROUND_SAMPLES = [
  {
    id: "kitchen-sink",
    label: "Kitchen sink",
    markdown: [
      "# Editor playground",
      "",
      "Use this page to develop `@fluxnotes/editor` without starting Electron.",
      "",
      "## Formatting",
      "",
      "- Bullet item",
      "- Another item",
      "- [ ] Task item",
      "- [x] Done item",
      "",
      "> Quote with **bold** and _italic_ text.",
      "",
      "| Feature | State |",
      "| --- | --- |",
      "| Tables | Ready |",
      "| Code | Ready |",
      "",
      "```ts",
      'const message = "Hello from the editor playground";',
      "console.log(message);",
      "```",
    ].join("\n"),
  },
  {
    id: "empty",
    label: "Empty block",
    markdown: "",
  },
  {
    id: "long",
    label: "Long note",
    markdown: [
      "## Development notes",
      "",
      "This sample keeps enough content on screen to exercise selection, scrolling, toolbar state, and Markdown output.",
      "",
      "### Checklist",
      "",
      "- [ ] Paste Markdown",
      "- [ ] Paste an image",
      "- [ ] Copy rich content",
      "- [ ] Toggle code line numbers",
      "",
      "### Links",
      "",
      "Visit [Fluxnotes](https://example.com) and edit the link popover.",
    ].join("\n"),
  },
] as const satisfies readonly PlaygroundSample[];

function findSample(sampleId: string): PlaygroundSample {
  return PLAYGROUND_SAMPLES.find((sample) => sample.id === sampleId) ?? PLAYGROUND_SAMPLES[0];
}

export function PlaygroundApp() {
  const [editorHandle, setEditorHandle] = useState<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createPlaygroundBlockEditorRuntime(), []);
  const [sampleId, setSampleId] = useState<string>(PLAYGROUND_SAMPLES[0].id);
  const [editorKey, setEditorKey] = useState(0);
  const [markdown, setMarkdown] = useState(PLAYGROUND_SAMPLES[0].markdown);
  const [theme, setTheme] = useState<PlaygroundTheme>("light");
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const editorConfig = useMemo<BlockEditorConfigInput>(
    () => ({
      appearance: {
        resolvedTheme: theme,
      },
      markdown: {
        codeBlock: {
          showLineNumbers,
        },
      },
      shortcuts: {
        actions: BLOCK_EDITOR_SHORTCUT_DEFAULTS,
      },
    }),
    [showLineNumbers, theme],
  );

  const resetEditor = useCallback(
    (nextSampleId = sampleId) => {
      const sample = findSample(nextSampleId);

      setSampleId(sample.id);
      setMarkdown(sample.markdown);
      setEditorHandle(null);
      setEditorKey((key) => key + 1);
    },
    [sampleId],
  );

  return (
    <main
      className={cn(
        "bg-background text-foreground flex min-h-full flex-col gap-4 px-5 py-4",
        theme,
      )}
    >
      <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Editor Playground</h1>
          <p className="text-muted-foreground text-sm">@fluxnotes/editor standalone development</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sampleId}
            onValueChange={(nextSampleId) => {
              if (typeof nextSampleId === "string") {
                resetEditor(nextSampleId);
              }
            }}
          >
            <SelectTrigger aria-label="Sample" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYGROUND_SAMPLES.map((sample) => (
                <SelectItem key={sample.id} value={sample.id}>
                  {sample.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => resetEditor()}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <Button
            aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}
            size="icon"
            type="button"
            variant="outline"
            onClick={() =>
              setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))
            }
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 lg:flex-row">
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={showLineNumbers}
            onCheckedChange={(checked) => setShowLineNumbers(checked === true)}
          />
          Code line numbers
        </label>
      </section>

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <article className="bg-card min-h-0 overflow-auto rounded-lg border p-5 py-3">
          <BlockEditorToolbar
            controller={editorHandle}
            shortcuts={BLOCK_EDITOR_SHORTCUT_DEFAULTS}
          />
          <BlockEditor
            key={editorKey}
            ref={setEditorHandle}
            config={editorConfig}
            initialMarkdown={markdown}
            runtime={runtime}
            onMarkdownChange={setMarkdown}
          />
        </article>

        <PlaygroundPreview editor={editorHandle} />
      </section>
    </main>
  );
}
