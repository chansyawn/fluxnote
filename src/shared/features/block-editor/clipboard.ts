import type { SerializedLexicalNode } from "lexical";
import { z } from "zod";

const BLOCK_EDITOR_CLIPBOARD_HTML_MARKER = "fluxnotes-block-editor";
const BLOCK_EDITOR_CLIPBOARD_HTML_MARKER_PATTERN =
  /<!--fluxnotes-block-editor:([A-Za-z0-9_.!~*'()%~-]+)-->/;
const BLOCK_EDITOR_CLIPBOARD_HTML_MARKER_GLOBAL_PATTERN =
  /<!--fluxnotes-block-editor:[A-Za-z0-9_.!~*'()%~-]+-->/g;

export type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
    src?: unknown;
  };

const clipboardSerializedNodeSchema: z.ZodType<ClipboardSerializedNode> = z.lazy(() =>
  z
    .object({
      children: z.array(clipboardSerializedNodeSchema).optional(),
      src: z.unknown().optional(),
      type: z.string(),
      version: z.number(),
    })
    .catchall(z.unknown()),
);

export const blockEditorClipboardPayloadSchema = z.object({
  nodes: z.array(clipboardSerializedNodeSchema),
  sourceBlockId: z.string().min(1),
  version: z.literal(1),
});

export const blockEditorClipboardWriteRequestSchema = z.object({
  html: z.string(),
  imageFileUrl: z.string().optional(),
  payload: blockEditorClipboardPayloadSchema,
  text: z.string(),
});

export type BlockEditorClipboardPayload = z.infer<typeof blockEditorClipboardPayloadSchema>;
export type BlockEditorClipboardWriteRequest = z.infer<
  typeof blockEditorClipboardWriteRequestSchema
>;

export function encodeBlockEditorClipboardHtml(
  html: string,
  payload: BlockEditorClipboardPayload,
): string {
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));

  // Electron cannot atomically write custom clipboard buffers with text/html/image formats:
  // clipboard.writeBuffer() replaces the clipboard contents written by clipboard.write().
  // Prefixing the HTML with an inert comment keeps the Fluxnotes payload in the same
  // standard HTML format batch while remaining invisible when pasted into external apps.
  return `<!--${BLOCK_EDITOR_CLIPBOARD_HTML_MARKER}:${encodedPayload}-->${html}`;
}

export function decodeBlockEditorClipboardHtml(html: string): BlockEditorClipboardPayload | null {
  const match = BLOCK_EDITOR_CLIPBOARD_HTML_MARKER_PATTERN.exec(html);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as unknown;
    const result = blockEditorClipboardPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function stripBlockEditorClipboardHtmlMetadata(html: string): string {
  return html.replaceAll(BLOCK_EDITOR_CLIPBOARD_HTML_MARKER_GLOBAL_PATTERN, "");
}
