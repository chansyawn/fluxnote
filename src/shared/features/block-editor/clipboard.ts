export interface ClipboardSerializedNode extends Record<string, unknown> {
  children?: ClipboardSerializedNode[];
  src?: unknown;
  type: string;
  version: number;
}
