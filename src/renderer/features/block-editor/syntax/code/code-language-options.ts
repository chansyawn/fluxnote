import { normalizeCodeLanguage } from "@lexical/code-shiki";

export interface CodeLanguageOption {
  value: string;
  label: string;
}

export const PLAIN_TEXT_LANGUAGE = "plain";

export const CODE_LANGUAGE_OPTIONS: ReadonlyArray<CodeLanguageOption> = [
  { label: "Plain text", value: PLAIN_TEXT_LANGUAGE },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "TSX", value: "tsx" },
  { label: "JSX", value: "jsx" },
  { label: "JSON", value: "json" },
  { label: "CSS", value: "css" },
  { label: "HTML", value: "html" },
  { label: "Markdown", value: "markdown" },
  { label: "Python", value: "python" },
  { label: "Shell", value: "shellscript" },
  { label: "SQL", value: "sql" },
  { label: "YAML", value: "yaml" },
];

export function normalizeCodeBlockLanguage(language: string | null | undefined): string {
  if (!language) {
    return PLAIN_TEXT_LANGUAGE;
  }

  const normalizedLanguage = normalizeCodeLanguage(language);
  return normalizedLanguage || PLAIN_TEXT_LANGUAGE;
}

export function getCodeLanguageOption(language: string | null | undefined): CodeLanguageOption {
  const normalizedLanguage = normalizeCodeBlockLanguage(language);
  return (
    CODE_LANGUAGE_OPTIONS.find((option) => option.value === normalizedLanguage) ??
    CODE_LANGUAGE_OPTIONS[0]
  );
}

export function getCodeLanguageLabel(language: string | null | undefined): string {
  return getCodeLanguageOption(language).label;
}

export function getCodeNodeLanguage(option: CodeLanguageOption): string | null {
  return option.value === PLAIN_TEXT_LANGUAGE ? PLAIN_TEXT_LANGUAGE : option.value;
}
