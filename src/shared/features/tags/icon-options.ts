export const TAG_LUCIDE_ICON_IDS = [
  "tag",
  "folder",
  "star",
  "bookmark",
  "lightbulb",
  "code",
  "bug",
  "briefcase",
  "calendar",
  "clock",
  "flag",
  "heart",
  "home",
  "mail",
  "rocket",
  "book-open",
  "check-circle",
  "alert-circle",
  "pencil",
  "palette",
] as const;

export const TAG_SIMPLE_ICON_IDS = [
  "github",
  "gitlab",
  "telegram",
  "notion",
  "figma",
  "react",
  "typescript",
  "javascript",
  "python",
  "docker",
  "kubernetes",
  "vercel",
  "openrouter",
  "anthropic",
  "gmail",
  "googlecalendar",
  "linear",
  "jira",
  "trello",
  "zoom",
] as const;

const TAG_LUCIDE_ICON_ID_SET = new Set<string>(TAG_LUCIDE_ICON_IDS);
const TAG_SIMPLE_ICON_ID_SET = new Set<string>(TAG_SIMPLE_ICON_IDS);

export type TagLucideIconId = (typeof TAG_LUCIDE_ICON_IDS)[number];
export type TagSimpleIconId = (typeof TAG_SIMPLE_ICON_IDS)[number];
export type TagIcon = `lucide:${TagLucideIconId}` | `simpleicon:${TagSimpleIconId}`;

export function isTagIcon(value: string | null): value is TagIcon | null {
  if (value === null) {
    return true;
  }

  const [kind, id, ...rest] = value.split(":");
  if (rest.length > 0 || !id) {
    return false;
  }

  if (kind === "lucide") {
    return TAG_LUCIDE_ICON_ID_SET.has(id);
  }

  if (kind === "simpleicon") {
    return TAG_SIMPLE_ICON_ID_SET.has(id);
  }

  return false;
}
