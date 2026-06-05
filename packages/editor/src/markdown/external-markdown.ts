const ESCAPED_DOLLAR_PATTERN = /\\\$/g;
const HORIZONTAL_WHITESPACE_ENTITY_PATTERN = /&#(?:x20|X20|32|x9|X9|9);/g;
const WORD_INTERNAL_UNDERSCORE_PATTERN = /(?<=[A-Za-z0-9])\\_(?=[A-Za-z0-9])/g;
const FENCE_START_PATTERN = /^( {0,3})(`{3,}|~{3,})/;

function cleanPlainMarkdownChunk(value: string): string {
  return value
    .replaceAll(HORIZONTAL_WHITESPACE_ENTITY_PATTERN, (entity) =>
      entity === "&#x9;" || entity === "&#X9;" || entity === "&#9;" ? "\t" : " ",
    )
    .replaceAll(WORD_INTERNAL_UNDERSCORE_PATTERN, "_")
    .split(/(\n)/)
    .map((part) => (part === "\n" ? part : cleanEscapedDollars(part)))
    .join("");
}

function findLineEndIncludingNewline(markdown: string, index: number): number {
  const lineEnd = markdown.indexOf("\n", index);
  return lineEnd === -1 ? markdown.length : lineEnd + 1;
}

function findClosingFence(
  markdown: string,
  start: number,
  marker: "`" | "~",
  size: number,
): number {
  let index = start;

  while (index < markdown.length) {
    const lineEnd = findLineEndIncludingNewline(markdown, index);
    const line = markdown.slice(index, lineEnd).replace(/\n$/, "");
    const match = FENCE_START_PATTERN.exec(line);

    if (match?.[2]?.startsWith(marker.repeat(size)) && line.slice(match[0].length).trim() === "") {
      return lineEnd;
    }

    index = lineEnd;
  }

  return markdown.length;
}

function canOpenMathDollar(line: string, index: number): boolean {
  const next = line[index + 2];
  return next !== undefined && next !== "$" && !/[\s\d]/.test(next);
}

function canCloseMathDollar(line: string, index: number): boolean {
  const previous = line[index - 1];
  return previous !== undefined && previous !== "$" && !/\s/.test(previous);
}

function collectProtectedDollarEscapes(line: string): Set<number> {
  const protectedEscapes = new Set<number>();
  const indexes = [...line.matchAll(ESCAPED_DOLLAR_PATTERN)].map((match) => match.index);

  for (let index = 0; index < indexes.length; index += 1) {
    const current = indexes[index];
    const next = indexes[index + 1];

    if (next === current + 2) {
      protectedEscapes.add(current);
      protectedEscapes.add(next);
      continue;
    }

    if (!canOpenMathDollar(line, current)) {
      continue;
    }

    const closing = indexes
      .slice(index + 1)
      .find((candidate) => canCloseMathDollar(line, candidate));
    if (closing !== undefined && closing > current + 2) {
      protectedEscapes.add(current);
      protectedEscapes.add(closing);
    }
  }

  return protectedEscapes;
}

function cleanEscapedDollars(line: string): string {
  const protectedEscapes = collectProtectedDollarEscapes(line);
  return line.replaceAll(ESCAPED_DOLLAR_PATTERN, (match, offset: number) =>
    protectedEscapes.has(offset) ? match : "$",
  );
}

function splitInlineCode(value: string): string {
  let normalized = "";
  let cursor = 0;

  while (cursor < value.length) {
    const match = /`+/.exec(value.slice(cursor));
    if (!match) {
      break;
    }

    const opener = match[0];
    const openerIndex = cursor + match.index;
    const closerIndex = value.indexOf(opener, openerIndex + opener.length);

    if (closerIndex === -1) {
      break;
    }

    normalized += cleanPlainMarkdownChunk(value.slice(cursor, openerIndex));
    normalized += value.slice(openerIndex, closerIndex + opener.length);
    cursor = closerIndex + opener.length;
  }

  return normalized + cleanPlainMarkdownChunk(value.slice(cursor));
}

export function normalizeExternalMarkdown(markdown: string): string {
  let normalized = "";
  let chunkStart = 0;
  let lineStart = 0;

  while (lineStart < markdown.length) {
    const lineEnd = findLineEndIncludingNewline(markdown, lineStart);
    const line = markdown.slice(lineStart, lineEnd).replace(/\n$/, "");
    const fenceMatch = FENCE_START_PATTERN.exec(line);

    if (!fenceMatch) {
      lineStart = lineEnd;
      continue;
    }

    const marker = fenceMatch[2][0] as "`" | "~";
    const closingEnd = findClosingFence(markdown, lineEnd, marker, fenceMatch[2].length);

    normalized += splitInlineCode(markdown.slice(chunkStart, lineStart));
    normalized += markdown.slice(lineStart, closingEnd);
    chunkStart = closingEnd;
    lineStart = closingEnd;
  }

  return normalized + splitInlineCode(markdown.slice(chunkStart));
}
