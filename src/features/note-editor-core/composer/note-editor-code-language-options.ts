import { getCodeLanguageOptions, normalizeCodeLanguage } from "@lexical/code-shiki";

export type CodeLanguageOption = {
  value: string;
  label: string;
  aliases: ReadonlyArray<string>;
};

type CommonCodeLanguageConfig = {
  value: string;
  aliases?: ReadonlyArray<string>;
  label: string;
};

const COMMON_CODE_LANGUAGE_CONFIG: ReadonlyArray<CommonCodeLanguageConfig> = [
  { value: "text", aliases: ["plaintext", "plain-text", "txt"], label: "Plain text" },
  { value: "ts", aliases: ["typescript"], label: "TypeScript" },
  { value: "tsx", aliases: ["typescriptreact"], label: "TSX" },
  { value: "js", aliases: ["javascript", "node"], label: "JavaScript" },
  { value: "jsx", aliases: ["javascriptreact"], label: "JSX" },
  { value: "json", aliases: ["jsonc"], label: "JSON" },
  { value: "bash", aliases: ["sh", "shell", "zsh"], label: "Bash" },
  { value: "python", aliases: ["py"], label: "Python" },
  { value: "go", aliases: ["golang"], label: "Go" },
  { value: "rust", aliases: ["rs"], label: "Rust" },
  { value: "java", aliases: ["jdk"], label: "Java" },
  { value: "kotlin", aliases: ["kt", "kts"], label: "Kotlin" },
  { value: "swift", aliases: ["swiftlang"], label: "Swift" },
  { value: "c", aliases: ["h"], label: "C" },
  { value: "cpp", aliases: ["c++", "cxx", "cc"], label: "C++" },
  { value: "csharp", aliases: ["c#", "cs"], label: "C#" },
  { value: "sql", aliases: ["mysql", "postgresql"], label: "SQL" },
  { value: "yaml", aliases: ["yml"], label: "YAML" },
  { value: "toml", aliases: ["tml"], label: "TOML" },
  { value: "markdown", aliases: ["md"], label: "Markdown" },
  { value: "html", aliases: ["htm"], label: "HTML" },
  { value: "css", aliases: ["stylesheet"], label: "CSS" },
  { value: "vue", aliases: ["vuejs"], label: "Vue" },
  { value: "svelte", aliases: ["sveltekit"], label: "Svelte" },
  { value: "dockerfile", aliases: ["docker"], label: "Dockerfile" },
];

const COMMON_LANGUAGE_VARIANT_MAP = new Map<string, string>();

for (const config of COMMON_CODE_LANGUAGE_CONFIG) {
  const canonicalValue = normalizeCodeLanguage(config.value);
  COMMON_LANGUAGE_VARIANT_MAP.set(canonicalValue, canonicalValue);

  for (const alias of config.aliases ?? []) {
    COMMON_LANGUAGE_VARIANT_MAP.set(normalizeCodeLanguage(alias), canonicalValue);
  }
}

export function resolveCodeLanguageVariant(language: string): string | null {
  const normalizedLanguage = normalizeCodeLanguage(language);
  return COMMON_LANGUAGE_VARIANT_MAP.get(normalizedLanguage) ?? null;
}

export function getCodeLanguageSearchTokens(option: CodeLanguageOption): ReadonlyArray<string> {
  return [
    option.label.toLocaleLowerCase(),
    option.value.toLocaleLowerCase(),
    ...option.aliases.map((alias) => alias.toLocaleLowerCase()),
  ];
}

export function getCommonCodeLanguageOptions(plainTextLabel: string): CodeLanguageOption[] {
  const availableLanguageLabelMap = new Map<string, string>();

  for (const [value, label] of getCodeLanguageOptions()) {
    const normalizedValue = normalizeCodeLanguage(value);

    if (!availableLanguageLabelMap.has(normalizedValue)) {
      availableLanguageLabelMap.set(normalizedValue, label);
    }
  }

  const options: CodeLanguageOption[] = [];
  const insertedValues = new Set<string>();

  for (const config of COMMON_CODE_LANGUAGE_CONFIG) {
    const normalizedValue = normalizeCodeLanguage(config.value);

    if (insertedValues.has(normalizedValue)) {
      continue;
    }

    const aliases = Array.from(
      new Set(
        [config.value, ...(config.aliases ?? [])]
          .map((token) => token.trim().toLocaleLowerCase())
          .filter((token) => token.length > 0)
          .filter((token) => token !== normalizedValue),
      ),
    );

    options.push({
      value: normalizedValue,
      label:
        normalizedValue === "text"
          ? plainTextLabel
          : (availableLanguageLabelMap.get(normalizedValue) ?? config.label),
      aliases,
    });
    insertedValues.add(normalizedValue);
  }

  return options;
}
