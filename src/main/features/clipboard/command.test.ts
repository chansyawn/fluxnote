import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readText: vi.fn(),
  write: vi.fn(),
}));

vi.mock("electron", () => ({
  clipboard: {
    readText: mocks.readText,
    write: mocks.write,
  },
}));

import { BLOCK_EDITOR_CLIPBOARD_MIME } from "@shared/features/block-editor/clipboard";

import { registerClipboardCommands } from "./command";

describe("clipboard command", () => {
  beforeEach(() => {
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
