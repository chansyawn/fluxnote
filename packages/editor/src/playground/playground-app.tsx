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
import { findPlaygroundSample, PLAYGROUND_SAMPLES } from "./playground-samples";

type PlaygroundTheme = "dark" | "light";

const PLAYGROUND_SAMPLE_SELECT_ITEMS = PLAYGROUND_SAMPLES.map((sample) => ({
  label: sample.label,
  value: sample.id,
}));

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
      const sample = findPlaygroundSample(nextSampleId);

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
            items={PLAYGROUND_SAMPLE_SELECT_ITEMS}
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
