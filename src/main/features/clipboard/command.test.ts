import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFromPath: vi.fn(),
  readText: vi.fn(),
  write: vi.fn(),
}));

vi.mock("electron", () => ({
  clipboard: {
    readText: mocks.readText,
    write: mocks.write,
  },
  nativeImage: {
    createFromPath: mocks.createFromPath,
  },
}));

import {
  BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL,
  BLOCK_EDITOR_CLIPBOARD_MIME,
} from "@shared/features/block-editor/clipboard";

import { registerClipboardCommands } from "./command";

describe("clipboard command", () => {
  beforeEach(() => {
    mocks.createFromPath.mockReset();
    mocks.readText.mockReset();
    mocks.write.mockReset();
  });

  it("writes standard formats and stores block editor data in memory", () => {
    const handlers = new Map<string, (input: Record<string, string>) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: Record<string, string>) => unknown) =>
        handlers.set(name, handler),
      ),
    };

    registerClipboardCommands(ipc as never);
    const result = handlers.get("clipboard.write")?.({
      [BLOCK_EDITOR_CLIPBOARD_MIME]: "payload",
      "text/html": "<p>Text</p>",
      "text/plain": "Text",
    });

    expect(result).toBeUndefined();
    expect(mocks.write).toHaveBeenCalledWith({
      html: "<p>Text</p>",
      text: "Text",
    });
  });

  it("writes a native image when image file url is provided", () => {
    const handlers = new Map<string, (input: Record<string, string>) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: Record<string, string>) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    const image = {
      isEmpty: vi.fn(() => false),
    };
    mocks.createFromPath.mockReturnValue(image);

    registerClipboardCommands(ipc as never);
    handlers.get("clipboard.write")?.({
      [BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]: "file:///tmp/block-1/photo.png",
      [BLOCK_EDITOR_CLIPBOARD_MIME]: "payload",
      "text/html": '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      "text/plain": "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.createFromPath).toHaveBeenCalledWith("/tmp/block-1/photo.png");
    expect(mocks.write).toHaveBeenCalledWith({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      image,
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
  });

  it("falls back to standard formats when image cannot be created", () => {
    const handlers = new Map<string, (input: Record<string, string>) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input: Record<string, string>) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    mocks.createFromPath.mockReturnValue({
      isEmpty: vi.fn(() => true),
    });

    registerClipboardCommands(ipc as never);
    handlers.get("clipboard.write")?.({
      [BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]: "file:///tmp/block-1/photo.png",
      [BLOCK_EDITOR_CLIPBOARD_MIME]: "payload",
      "text/html": '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      "text/plain": "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.write).toHaveBeenCalledWith({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
  });

  it("reads stored block editor data while plain text still matches", () => {
    const handlers = new Map<string, (input?: Record<string, string>) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input?: Record<string, string>) => unknown) =>
        handlers.set(name, handler),
      ),
    };
    const data = {
      [BLOCK_EDITOR_CLIPBOARD_MIME]: "payload",
      "text/html": "<p>Text</p>",
      "text/plain": "Text",
    };

    registerClipboardCommands(ipc as never);
    handlers.get("clipboard.write")?.(data);
    mocks.readText.mockReturnValue("Text");

    expect(handlers.get("clipboard.read")?.()).toEqual({ data });
  });

  it("returns null when clipboard plain text no longer matches stored data", () => {
    const handlers = new Map<string, (input?: Record<string, string>) => unknown>();
    const ipc = {
      command: vi.fn((name: string, handler: (input?: Record<string, string>) => unknown) =>
        handlers.set(name, handler),
      ),
    };

    registerClipboardCommands(ipc as never);
    handlers.get("clipboard.write")?.({
      [BLOCK_EDITOR_CLIPBOARD_MIME]: "payload",
      "text/html": "<p>Text</p>",
      "text/plain": "Text",
    });
    mocks.readText.mockReturnValue("External");

    expect(handlers.get("clipboard.read")?.()).toEqual({ data: null });
    mocks.readText.mockReturnValue("Text");
    expect(handlers.get("clipboard.read")?.()).toEqual({ data: null });
  });
});
