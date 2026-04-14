import { getCodeLanguageOptions, normalizeCodeLanguage } from "@lexical/code-shiki";

export type CodeLanguageOption = {
  value: string;
  label: string;
};

type CommonCodeLanguageConfig = {
  value: string;
  fallbackLabel: string;
};

const COMMON_CODE_LANGUAGE_CONFIG: ReadonlyArray<CommonCodeLanguageConfig> = [
  { value: "text", fallbackLabel: "Plain text" },
  { value: "ts", fallbackLabel: "TypeScript" },
  { value: "tsx", fallbackLabel: "TSX" },
  { value: "js", fallbackLabel: "JavaScript" },
  { value: "jsx", fallbackLabel: "JSX" },
  { value: "json", fallbackLabel: "JSON" },
  { value: "bash", fallbackLabel: "Bash" },
  { value: "python", fallbackLabel: "Python" },
  { value: "go", fallbackLabel: "Go" },
  { value: "rust", fallbackLabel: "Rust" },
  { value: "java", fallbackLabel: "Java" },
  { value: "kotlin", fallbackLabel: "Kotlin" },
  { value: "swift", fallbackLabel: "Swift" },
  { value: "c", fallbackLabel: "C" },
  { value: "cpp", fallbackLabel: "C++" },
  { value: "csharp", fallbackLabel: "C#" },
  { value: "sql", fallbackLabel: "SQL" },
  { value: "yaml", fallbackLabel: "YAML" },
  { value: "toml", fallbackLabel: "TOML" },
  { value: "markdown", fallbackLabel: "Markdown" },
  { value: "html", fallbackLabel: "HTML" },
  { value: "css", fallbackLabel: "CSS" },
  { value: "vue", fallbackLabel: "Vue" },
  { value: "svelte", fallbackLabel: "Svelte" },
  { value: "dockerfile", fallbackLabel: "Dockerfile" },
];

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

    options.push({
      value: normalizedValue,
      label:
        normalizedValue === "text"
          ? plainTextLabel
          : (availableLanguageLabelMap.get(normalizedValue) ?? config.fallbackLabel),
    });
    insertedValues.add(normalizedValue);
  }

  return options;
}
