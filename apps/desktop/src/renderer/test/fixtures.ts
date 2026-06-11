import type { Block, ExternalEditSession, Tag } from "@renderer/clients";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@shared/features/preferences/user-preferences";

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
    isPendingAutoArchive: false,
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

export function createRendererUserPreferences(patch: UserPreferencesPatch = {}): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    appearance: {
      ...DEFAULT_USER_PREFERENCES.appearance,
      ...patch.appearance,
    },
    autoArchive: {
      ...DEFAULT_USER_PREFERENCES.autoArchive,
      ...patch.autoArchive,
    },
    markdown: {
      ...DEFAULT_USER_PREFERENCES.markdown,
      ...patch.markdown,
      codeBlock: {
        ...DEFAULT_USER_PREFERENCES.markdown.codeBlock,
        ...patch.markdown?.codeBlock,
      },
    },
    shortcuts: {
      ...DEFAULT_USER_PREFERENCES.shortcuts,
      ...patch.shortcuts,
    },
    telemetry: {
      ...DEFAULT_USER_PREFERENCES.telemetry,
      ...patch.telemetry,
    },
    appUpdate: {
      ...DEFAULT_USER_PREFERENCES.appUpdate,
      ...patch.appUpdate,
    },
    externalEdit: {
      ...DEFAULT_USER_PREFERENCES.externalEdit,
      ...patch.externalEdit,
    },
  };
}

export function createExternalEditSession(
  overrides: Partial<ExternalEditSession> = {},
): ExternalEditSession {
  return {
    blockId: "block-1",
    createdAt: FIXTURE_TIMESTAMP,
    id: "edit-1",
    origin: {
      cwd: "/tmp",
      git: null,
      kind: "cli",
      requestedFilePath: "/tmp/requested.md",
      targetFilePath: "/tmp/target.md",
    },
    submission: { transport: "direct" },
    ...overrides,
  };
}

export function createCopyOnlyExternalEditSession(
  overrides: Partial<ExternalEditSession> = {},
): ExternalEditSession {
  return createExternalEditSession({
    origin: {
      app: {
        bundleId: null,
        icon: null,
        name: null,
        processId: 0,
      },
      elementRole: null,
      kind: "macApp",
    },
    submission: { transport: "clipboard" },
    ...overrides,
  });
}
