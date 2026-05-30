import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

const codeBlockControlsPluginKey = new PluginKey("FLUXNOTES_CODE_BLOCK_CONTROLS");

export interface CodeBlockControlTarget {
  element: HTMLElement;
  id: string;
  language: string | null;
  pos: number;
  text: string;
  view: EditorView;
}

function areCodeBlockTargetsEqual(
  previousTargets: ReadonlyArray<CodeBlockControlTarget>,
  nextTargets: ReadonlyArray<CodeBlockControlTarget>,
): boolean {
  if (previousTargets.length !== nextTargets.length) return false;

  return previousTargets.every((previousTarget, index) => {
    const nextTarget = nextTargets[index];
    return (
      previousTarget.element === nextTarget.element &&
      previousTarget.language === nextTarget.language &&
      previousTarget.pos === nextTarget.pos &&
      previousTarget.text === nextTarget.text &&
      previousTarget.view === nextTarget.view
    );
  });
}

function readCodeBlockTargets(view: EditorView): CodeBlockControlTarget[] {
  const targets: CodeBlockControlTarget[] = [];

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== "code_block") return true;

    const element = view.nodeDOM(pos);
    if (!(element instanceof HTMLElement)) return false;

    targets.push({
      element,
      id: `${pos}:${node.attrs.language ?? ""}`,
      language: typeof node.attrs.language === "string" ? node.attrs.language : null,
      pos,
      text: node.textContent,
      view,
    });

    return false;
  });

  return targets;
}

export class CodeBlockControlsStateStore {
  #listeners = new Set<() => void>();
  #targets: CodeBlockControlTarget[] = [];

  getSnapshot = () => this.#targets;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  publish = (nextTargets: CodeBlockControlTarget[]) => {
    if (areCodeBlockTargetsEqual(this.#targets, nextTargets)) return;

    this.#targets = nextTargets;
    for (const listener of this.#listeners) listener();
  };

  clear = () => {
    this.publish([]);
  };

  destroy = () => {
    this.#listeners.clear();
    this.#targets = [];
  };
}

export function createCodeBlockControlsPlugin(store: CodeBlockControlsStateStore) {
  return $prose(
    () =>
      new Plugin({
        key: codeBlockControlsPluginKey,
        view(view) {
          store.publish(readCodeBlockTargets(view));

          return {
            destroy() {
              store.clear();
            },
            update(nextView) {
              store.publish(readCodeBlockTargets(nextView));
            },
          };
        },
      }),
  );
}
