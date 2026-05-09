import { defineExtension } from "lexical";

import type { BlockEditorRuntime } from "./types";

function throwMissingRuntime(): never {
  throw new Error("Block editor runtime is unavailable.");
}

export const UNAVAILABLE_BLOCK_EDITOR_RUNTIME: BlockEditorRuntime = {
  assets: {
    copy: async () => throwMissingRuntime(),
    create: async () => throwMissingRuntime(),
    resolve: async () => throwMissingRuntime(),
  },
  clipboard: {
    write: async () => throwMissingRuntime(),
    writeText: async () => throwMissingRuntime(),
  },
};

export interface BlockEditorRuntimeExtensionConfig {
  runtime: BlockEditorRuntime;
}

export const BlockEditorRuntimeExtension = defineExtension({
  name: "fluxnotes/block-editor/runtime",
  config: {
    runtime: UNAVAILABLE_BLOCK_EDITOR_RUNTIME,
  } satisfies BlockEditorRuntimeExtensionConfig,
});
