import {
  TAG_LUCIDE_ICON_IDS,
  TAG_SIMPLE_ICON_IDS,
  type TagLucideIconId,
  type TagSimpleIconId,
} from "@shared/features/tags/icon-options";
import {
  AlertCircleIcon,
  BookOpenIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BugIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeIcon,
  FlagIcon,
  FolderIcon,
  HeartIcon,
  HomeIcon,
  LightbulbIcon,
  MailIcon,
  PaletteIcon,
  PencilIcon,
  RocketIcon,
  StarIcon,
  TagIcon,
  type LucideIcon,
} from "lucide-react";
import {
  siAnthropic,
  siDocker,
  siFigma,
  siGithub,
  siGitlab,
  siGmail,
  siGooglecalendar,
  siJira,
  siJavascript,
  siKubernetes,
  siLinear,
  siNotion,
  siOpenrouter,
  siPython,
  siReact,
  siTelegram,
  siTrello,
  siTypescript,
  siVercel,
  siZoom,
  type SimpleIcon,
} from "simple-icons";

export interface TagIconOption {
  id: string;
  label: string;
  value: `lucide:${TagLucideIconId}` | `simpleicon:${TagSimpleIconId}`;
}

export const TAG_LUCIDE_ICON_COMPONENTS: Record<TagLucideIconId, LucideIcon> = {
  tag: TagIcon,
  folder: FolderIcon,
  star: StarIcon,
  bookmark: BookmarkIcon,
  lightbulb: LightbulbIcon,
  code: CodeIcon,
  bug: BugIcon,
  briefcase: BriefcaseIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  flag: FlagIcon,
  heart: HeartIcon,
  home: HomeIcon,
  mail: MailIcon,
  rocket: RocketIcon,
  "book-open": BookOpenIcon,
  "check-circle": CheckCircleIcon,
  "alert-circle": AlertCircleIcon,
  pencil: PencilIcon,
  palette: PaletteIcon,
};

export const TAG_SIMPLE_ICON_COMPONENTS: Record<TagSimpleIconId, SimpleIcon> = {
  github: siGithub,
  gitlab: siGitlab,
  telegram: siTelegram,
  notion: siNotion,
  figma: siFigma,
  react: siReact,
  typescript: siTypescript,
  javascript: siJavascript,
  python: siPython,
  docker: siDocker,
  kubernetes: siKubernetes,
  vercel: siVercel,
  openrouter: siOpenrouter,
  anthropic: siAnthropic,
  gmail: siGmail,
  googlecalendar: siGooglecalendar,
  linear: siLinear,
  jira: siJira,
  trello: siTrello,
  zoom: siZoom,
};

function titleCaseIconId(id: string): string {
  return id
    .split("-")
    .map((part) => part.slice(0, 1).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

export const TAG_LUCIDE_ICON_OPTIONS: TagIconOption[] = TAG_LUCIDE_ICON_IDS.map((id) => ({
  id,
  label: titleCaseIconId(id),
  value: `lucide:${id}`,
}));

export const TAG_SIMPLE_ICON_OPTIONS: TagIconOption[] = TAG_SIMPLE_ICON_IDS.map((id) => ({
  id,
  label: TAG_SIMPLE_ICON_COMPONENTS[id].title,
  value: `simpleicon:${id}`,
}));
