import { useExtensionDependency } from "@lexical/react/useExtensionComponent";
import { defineExtension } from "lexical";

import type { BlockEditorRuntime } from "./types";

export const BlockEditorRuntimeExtension = defineExtension({
  name: "fluxnotes/block-editor/runtime",
  config: { runtime: undefined as unknown as BlockEditorRuntime },
});

export const useBlockEditorRuntime = () =>
  useExtensionDependency(BlockEditorRuntimeExtension).config.runtime;
