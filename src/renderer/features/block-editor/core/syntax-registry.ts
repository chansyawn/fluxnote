import type { EditorThemeClasses, Klass, LexicalNode } from "lexical";

import { codeModule } from "../syntax/code";
import { emphasisModule } from "../syntax/emphasis";
import { headingModule } from "../syntax/heading";
import { linkModule } from "../syntax/link";
import { listModule } from "../syntax/list";
import { paragraphModule } from "../syntax/paragraph";
import { placeholdersModule } from "../syntax/placeholders";
import { quoteModule } from "../syntax/quote";
import { thematicBreakModule } from "../syntax/thematic-break";
import type {
  LexicalExporter,
  MarkdownSyntaxModule,
  MdastImporter,
  SyntaxPluginComponent,
} from "./syntax-module";

export const syntaxModules: ReadonlyArray<MarkdownSyntaxModule> = [
  paragraphModule,
  headingModule,
  emphasisModule,
  linkModule,
  quoteModule,
  listModule,
  codeModule,
  thematicBreakModule,
  placeholdersModule,
];

export const lexicalNodes: ReadonlyArray<Klass<LexicalNode>> = syntaxModules.flatMap(
  (module) => module.lexicalNodes ?? [],
);

export const liveInputTransformers = syntaxModules.flatMap(
  (module) => module.markdownTransformers ?? [],
);

export const syntaxPlugins: ReadonlyArray<SyntaxPluginComponent> = syntaxModules.flatMap(
  (module) => module.lexicalPlugins ?? [],
);

type ThemeObject = Record<string, unknown>;

function isThemeObject(value: unknown): value is ThemeObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeThemeRecord(target: ThemeObject, source: ThemeObject): ThemeObject {
  const merged: ThemeObject = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const existingValue = merged[key];
    merged[key] =
      isThemeObject(existingValue) && isThemeObject(value)
        ? mergeThemeRecord(existingValue, value)
        : value;
  }

  return merged;
}

function mergeThemeClasses(
  target: EditorThemeClasses,
  source: EditorThemeClasses,
): EditorThemeClasses {
  return mergeThemeRecord(target as ThemeObject, source as ThemeObject) as EditorThemeClasses;
}

export const blockEditorTheme: EditorThemeClasses = syntaxModules.reduce(
  (theme, module) => (module.theme ? mergeThemeClasses(theme, module.theme) : theme),
  {},
);

export const mdastImporters: ReadonlyMap<string, MdastImporter> = new Map(
  syntaxModules.flatMap((module) =>
    Object.entries(module.importMdast ?? {}).map(([type, importer]) => [type, importer] as const),
  ),
);

export const lexicalExporters: ReadonlyMap<string, LexicalExporter> = new Map(
  syntaxModules.flatMap((module) =>
    Object.entries(module.exportMdast ?? {}).map(([type, exporter]) => [type, exporter] as const),
  ),
);
