const ISOLATED_TASK_MARKER_LINE = /^( {0,3})\[([ xX])\](?=\s|$)/gm;

/**
 * Escapes paragraph-level checkbox markers before Markdown is parsed with
 * remark-gfm.
 *
 * GitHub Flavored Markdown only defines task checkboxes as part of list items,
 * for example `- [ ] Todo` or `- [x] Done`. A standalone paragraph that starts
 * with `[ ]` is plain text, but the GFM task-list micromark extension still
 * emits task-list checkbox tokens for some malformed inputs such as:
 *
 * ```markdown
 * -
 * [ ]
 *   1.
 * ```
 *
 * In development builds, `mdast-util-gfm-task-list-item` asserts that those
 * checkbox tokens always exit while the mdast stack is inside a `listItem`.
 * The malformed shape above violates that internal invariant and crashes the
 * editor before the document can open.
 *
 * We escape only line-start markers that cannot be valid GFM task list items:
 *
 * - `0..3` leading spaces are paragraph indentation in CommonMark.
 * - `4+` leading spaces are code block indentation and must remain untouched.
 * - Real task list items keep their list marker first, so `- [ ] Todo` does not
 *   match this rule.
 *
 * The escaped marker still renders back as visible text after parsing, while
 * valid task-list semantics are preserved.
 */
export function escapeIsolatedGfmTaskMarkers(markdown: string): string {
  return markdown.replace(ISOLATED_TASK_MARKER_LINE, "$1\\[$2]");
}
