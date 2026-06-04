import type { BlockEditorHandle, BlockEditorPreviewKind } from "@fluxnotes/editor";
import { BrandIcon } from "@fluxnotes/ui/components/brand-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@fluxnotes/ui/components/tabs";
import { siHtml5, siMarkdown } from "@fluxnotes/ui/icons/simple-icons";
import { useEffect, useMemo, useRef, useState } from "react";

interface PlaygroundPreviewProps {
  editor: BlockEditorHandle | null;
}

const PREVIEW_DEBOUNCE_MS = 250;

const PREVIEW_TABS = [
  { icon: siMarkdown, iconLabel: "Markdown", label: "SRC", value: "markdown-source" },
  {
    icon: siMarkdown,
    iconLabel: "Markdown",
    label: "SEL",
    value: "markdown-selected-export",
  },
  {
    icon: siMarkdown,
    iconLabel: "Markdown",
    label: "ALL",
    value: "markdown-document-export",
  },
  { icon: siHtml5, iconLabel: "HTML", label: "SEL", value: "html-selected-export" },
  { icon: siHtml5, iconLabel: "HTML", label: "ALL", value: "html-document-export" },
] as const satisfies ReadonlyArray<{
  icon: typeof siMarkdown;
  iconLabel: string;
  label: string;
  value: BlockEditorPreviewKind;
}>;

function isPlaygroundPreviewKind(value: unknown): value is BlockEditorPreviewKind {
  return PREVIEW_TABS.some((tab) => tab.value === value);
}

async function readPreviewTabContent(
  editor: BlockEditorHandle,
  kind: BlockEditorPreviewKind,
): Promise<string> {
  return await editor.getPreviewData({ kind });
}

export function PlaygroundPreview({ editor }: PlaygroundPreviewProps) {
  const [activeTab, setActiveTab] = useState<BlockEditorPreviewKind>("markdown-source");
  const [content, setContent] = useState("");
  const [revision, setRevision] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!editor) {
      return;
    }

    return editor.subscribePreviewChange(() => {
      setRevision((currentRevision) => currentRevision + 1);
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      setContent("");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(() => {
      void readPreviewTabContent(editor, activeTab).then((nextContent) => {
        if (requestIdRef.current === requestId) {
          setContent(nextContent);
        }
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, editor, revision]);

  const displayContent = useMemo(() => content || "(empty)", [content]);

  return (
    <aside className="bg-card flex min-h-0 flex-col overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-medium">Preview</h2>
          <p className="text-muted-foreground text-sm">Live source output</p>
        </div>
      </div>

      <Tabs
        className="min-h-0 flex-1 gap-0"
        value={activeTab}
        onValueChange={(value) => {
          if (isPlaygroundPreviewKind(value)) {
            setActiveTab(value);
          }
        }}
      >
        <div className="border-y px-4 py-2">
          <TabsList>
            {PREVIEW_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                aria-label={`${tab.iconLabel} ${tab.label}`}
                value={tab.value}
              >
                <BrandIcon icon={tab.icon} label={tab.iconLabel} />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {PREVIEW_TABS.map((tab) => (
          <TabsContent key={tab.value} className="min-h-0 overflow-hidden" value={tab.value}>
            <pre className="h-full overflow-auto p-4 font-mono text-xs whitespace-pre-wrap">
              {displayContent}
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
