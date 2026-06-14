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
  { label: "Vue", value: "vue" },
  { label: "Svelte", value: "svelte" },
  { label: "GraphQL", value: "graphql" },
  { label: "JSON", value: "json" },
  { label: "CSS", value: "css" },
  { label: "HTML", value: "html" },
  { label: "Markdown", value: "markdown" },
  { label: "XML", value: "xml" },
  { label: "YAML", value: "yaml" },
  { label: "TOML", value: "toml" },
  { label: "INI", value: "ini" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "PHP", value: "php" },
  { label: "Ruby", value: "ruby" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "Dart", value: "dart" },
  { label: "Objective-C", value: "objective-c" },
  { label: "Scala", value: "scala" },
  { label: "R", value: "r" },
  { label: "Lua", value: "lua" },
  { label: "Perl", value: "perl" },
  { label: "Shell", value: "shellscript" },
  { label: "PowerShell", value: "powershell" },
  { label: "SQL", value: "sql" },
  { label: "Dockerfile", value: "docker" },
  { label: "Diff", value: "diff" },
  { label: "Makefile", value: "make" },
];

function normalizeCodeLanguageSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

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

export function filterCodeLanguageOptions(searchValue: string): ReadonlyArray<CodeLanguageOption> {
  const normalizedSearchValue = normalizeCodeLanguageSearchValue(searchValue);
  if (!normalizedSearchValue) {
    return CODE_LANGUAGE_OPTIONS;
  }

  const normalizedSearchLanguage = normalizeCodeLanguage(normalizedSearchValue);

  return CODE_LANGUAGE_OPTIONS.filter((option) => {
    const optionSearchValue = normalizeCodeLanguageSearchValue(`${option.label} ${option.value}`);
    return (
      optionSearchValue.includes(normalizedSearchValue) || option.value === normalizedSearchLanguage
    );
  });
}
