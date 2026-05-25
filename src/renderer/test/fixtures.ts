import type { Block, ExternalEditSession, Tag } from "@renderer/clients";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsPatch,
} from "@shared/features/preferences/settings";

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function createRendererBlock(overrides: Partial<Block> = {}): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: FIXTURE_TIMESTAMP,
    createdAt: FIXTURE_TIMESTAMP,
    id: "block-1",
    isKept: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: FIXTURE_TIMESTAMP,
    willArchive: false,
    ...overrides,
  };
}

export function createRendererTag(overrides: Partial<Tag> = {}): Tag {
  return {
    createdAt: FIXTURE_TIMESTAMP,
    id: "tag-1",
    name: "Tag 1",
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}

export function createRendererSettings(patch: SettingsPatch = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...patch.appearance,
    },
    autoArchive: {
      ...DEFAULT_SETTINGS.autoArchive,
      ...patch.autoArchive,
    },
    markdown: {
      ...DEFAULT_SETTINGS.markdown,
      ...patch.markdown,
      codeBlock: {
        ...DEFAULT_SETTINGS.markdown.codeBlock,
        ...patch.markdown?.codeBlock,
      },
    },
    shortcuts: {
      ...DEFAULT_SETTINGS.shortcuts,
      ...patch.shortcuts,
    },
    telemetry: {
      ...DEFAULT_SETTINGS.telemetry,
      ...patch.telemetry,
    },
    appUpdate: {
      ...DEFAULT_SETTINGS.appUpdate,
      ...patch.appUpdate,
    },
  };
}

export function createExternalEditSession(
  overrides: Partial<ExternalEditSession> = {},
): ExternalEditSession {
  return {
    blockId: "block-1",
    createdAt: FIXTURE_TIMESTAMP,
    editId: "edit-1",
    trigger: {
      cwd: "/tmp",
      requestedFilePath: "/tmp/requested.md",
      source: "cli",
      targetFilePath: "/tmp/target.md",
    },
    ...overrides,
  };
}
