export interface CodeLanguageOption {
  aliases?: readonly string[];
  label: string;
  shikiLang?: string;
  value: string;
}

export const PLAIN_TEXT_LANGUAGE = "plain";

export const CODE_LANGUAGE_OPTIONS: ReadonlyArray<CodeLanguageOption> = [
  { aliases: ["text", "plaintext", "plain_text"], label: "Plain text", value: PLAIN_TEXT_LANGUAGE },
  { aliases: ["js"], label: "JavaScript", shikiLang: "javascript", value: "javascript" },
  { aliases: ["ts"], label: "TypeScript", shikiLang: "typescript", value: "typescript" },
  { label: "TSX", shikiLang: "tsx", value: "tsx" },
  { label: "JSX", shikiLang: "jsx", value: "jsx" },
  { label: "Vue", shikiLang: "vue", value: "vue" },
  { label: "Svelte", shikiLang: "svelte", value: "svelte" },
  { label: "GraphQL", shikiLang: "graphql", value: "graphql" },
  { label: "JSON", shikiLang: "json", value: "json" },
  { label: "CSS", shikiLang: "css", value: "css" },
  { label: "HTML", shikiLang: "html", value: "html" },
  { label: "Markdown", shikiLang: "markdown", value: "markdown" },
  { label: "XML", shikiLang: "xml", value: "xml" },
  { label: "YAML", shikiLang: "yaml", value: "yaml" },
  { label: "TOML", shikiLang: "toml", value: "toml" },
  { label: "INI", shikiLang: "ini", value: "ini" },
  { label: "Python", shikiLang: "python", value: "python" },
  { label: "Java", shikiLang: "java", value: "java" },
  { label: "C", shikiLang: "c", value: "c" },
  { label: "C++", shikiLang: "cpp", value: "cpp" },
  { label: "C#", shikiLang: "csharp", value: "csharp" },
  { label: "Go", shikiLang: "go", value: "go" },
  { label: "Rust", shikiLang: "rust", value: "rust" },
  { label: "PHP", shikiLang: "php", value: "php" },
  { label: "Ruby", shikiLang: "ruby", value: "ruby" },
  { label: "Swift", shikiLang: "swift", value: "swift" },
  { label: "Kotlin", shikiLang: "kotlin", value: "kotlin" },
  { label: "Dart", shikiLang: "dart", value: "dart" },
  { label: "Objective-C", shikiLang: "objective-c", value: "objective-c" },
  { label: "Scala", shikiLang: "scala", value: "scala" },
  { label: "R", shikiLang: "r", value: "r" },
  { label: "Lua", shikiLang: "lua", value: "lua" },
  { label: "Perl", shikiLang: "perl", value: "perl" },
  {
    aliases: ["bash", "sh", "shell"],
    label: "Shell",
    shikiLang: "shellscript",
    value: "shellscript",
  },
  { label: "PowerShell", shikiLang: "powershell", value: "powershell" },
  { label: "SQL", shikiLang: "sql", value: "sql" },
  { aliases: ["dockerfile"], label: "Dockerfile", shikiLang: "dockerfile", value: "docker" },
  { label: "Diff", shikiLang: "diff", value: "diff" },
  { label: "Makefile", shikiLang: "make", value: "make" },
];

const CODE_LANGUAGE_ALIASES = new Map<string, CodeLanguageOption>(
  CODE_LANGUAGE_OPTIONS.flatMap((option) => [
    [option.value, option],
    ...(option.shikiLang ? ([[option.shikiLang, option]] as const) : []),
    ...(option.aliases?.map((alias) => [alias, option] as const) ?? []),
  ]),
);

function normalizeLanguage(language: string | null | undefined): string {
  return language?.trim().toLowerCase() ?? "";
}

export function getCodeLanguageOption(language: string | null | undefined): CodeLanguageOption {
  return CODE_LANGUAGE_ALIASES.get(normalizeLanguage(language)) ?? CODE_LANGUAGE_OPTIONS[0];
}

export function getCodeLanguageValue(option: CodeLanguageOption): string {
  return option.value === PLAIN_TEXT_LANGUAGE ? PLAIN_TEXT_LANGUAGE : option.value;
}

export function getShikiLanguage(language: string | null | undefined): string | undefined {
  return getCodeLanguageOption(language).shikiLang;
}

export const SHIKI_CODE_LANGUAGES = Array.from(
  new Set(CODE_LANGUAGE_OPTIONS.flatMap((option) => (option.shikiLang ? [option.shikiLang] : []))),
);
