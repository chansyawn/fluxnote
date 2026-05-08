import { withDOM } from "@lexical/headless/dom";

export function withBlockEditorDOM<T>(run: (window: typeof globalThis.window) => T): T {
  return withDOM(run);
}
