const TABLE_ROW_REGEXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_DIVIDER_REGEXP = /^(\| *(?::?-{3,}:?) *)+\|\s?$/;

export function isMarkdownTableRow(line: string): boolean {
  return TABLE_ROW_REGEXP.test(line);
}

export function isMarkdownTableDividerRow(line: string): boolean {
  return TABLE_DIVIDER_REGEXP.test(line);
}

export function splitTableRow(line: string): string[] {
  const content = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|\s*$/, "");
  const cells: string[] = [];
  let current = "";
  let inCodeSpan = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === "\\") {
      if (nextChar === "|" || nextChar === "\\") {
        current += nextChar;
        index += 1;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "`") {
      inCodeSpan = !inCodeSpan;
      current += char;
      continue;
    }

    if (char === "|" && !inCodeSpan) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}
