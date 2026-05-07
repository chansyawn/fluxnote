import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFromPath: vi.fn(),
  readHTML: vi.fn(),
  readBuffer: vi.fn(),
  write: vi.fn(),
  writeBuffer: vi.fn(),
}));

vi.mock("electron", () => ({
  clipboard: {
    readHTML: mocks.readHTML,
    readBuffer: mocks.readBuffer,
    write: mocks.write,
    writeBuffer: mocks.writeBuffer,
  },
  nativeImage: {
    createFromPath: mocks.createFromPath,
  },
}));

import {
  decodeBlockEditorClipboardHtml,
  encodeBlockEditorClipboardHtml,
} from "@shared/features/block-editor/clipboard";

import { registerClipboardCommands } from "./command";

const payload = {
  nodes: [{ text: "Text", type: "text", version: 1 }],
  sourceBlockId: "block-1",
  version: 1 as const,
};

function createHandlers(): Map<string, (input?: unknown) => unknown> {
  const handlers = new Map<string, (input?: unknown) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input?: unknown) => unknown) =>
      handlers.set(name, handler),
    ),
  };

  registerClipboardCommands(ipc as never);
  return handlers;
}

describe("clipboard command", () => {
  beforeEach(() => {
    mocks.createFromPath.mockReset();
    mocks.readHTML.mockReset();
    mocks.readBuffer.mockReset();
    mocks.write.mockReset();
    mocks.writeBuffer.mockReset();
    mocks.readHTML.mockReturnValue("");
    mocks.readBuffer.mockReturnValue(Buffer.alloc(0));
  });

  it("writes standard formats and block editor payload in one clipboard operation", () => {
    const handlers = createHandlers();
    const result = handlers.get("clipboard.write")?.({
      html: "<p>Text</p>",
      payload,
      text: "Text",
    });

    expect(result).toBeUndefined();
    expect(mocks.write).toHaveBeenCalledWith({
      html: encodeBlockEditorClipboardHtml("<p>Text</p>", payload),
      text: "Text",
    });
    expect(mocks.writeBuffer).not.toHaveBeenCalled();
    const [{ html }] = mocks.write.mock.calls[0] as [{ html: string; text: string }];
    expect(decodeBlockEditorClipboardHtml(html)).toEqual(payload);
  });

  it("writes a native image with the block editor payload metadata", () => {
    const handlers = createHandlers();
    const image = {
      isEmpty: vi.fn(() => false),
    };
    mocks.createFromPath.mockReturnValue(image);

    handlers.get("clipboard.write")?.({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      imageFileUrl: "file:///tmp/block-1/photo.png",
      payload,
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.createFromPath).toHaveBeenCalledWith("/tmp/block-1/photo.png");
    expect(mocks.write).toHaveBeenCalledWith({
      html: encodeBlockEditorClipboardHtml(
        '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
        payload,
      ),
      image,
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
    expect(mocks.writeBuffer).not.toHaveBeenCalled();
  });

  it("falls back to standard formats when image cannot be created", () => {
    const handlers = createHandlers();
    mocks.createFromPath.mockReturnValue({
      isEmpty: vi.fn(() => true),
    });

    handlers.get("clipboard.write")?.({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      imageFileUrl: "file:///tmp/block-1/photo.png",
      payload,
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.write).toHaveBeenCalledWith({
      html: encodeBlockEditorClipboardHtml(
        '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
        payload,
      ),
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
    expect(mocks.writeBuffer).not.toHaveBeenCalled();
  });

  it("reads a valid block editor payload from html metadata", () => {
    const handlers = createHandlers();
    mocks.readHTML.mockReturnValue(encodeBlockEditorClipboardHtml("<p>Text</p>", payload));

    expect(handlers.get("clipboard.read")?.()).toEqual({ payload });
    expect(mocks.readBuffer).not.toHaveBeenCalled();
  });

  it("reads a valid legacy block editor payload buffer", () => {
    const handlers = createHandlers();
    mocks.readBuffer.mockReturnValue(Buffer.from(JSON.stringify(payload), "utf8"));

    expect(handlers.get("clipboard.read")?.()).toEqual({ payload });
  });

  it("returns null when the block editor payload buffer is missing or invalid", () => {
    const handlers = createHandlers();
    mocks.readBuffer.mockReturnValueOnce(Buffer.alloc(0));
    expect(handlers.get("clipboard.read")?.()).toEqual({ payload: null });

    mocks.readBuffer.mockReturnValueOnce(Buffer.from("{", "utf8"));
    expect(handlers.get("clipboard.read")?.()).toEqual({ payload: null });

    mocks.readBuffer.mockReturnValueOnce(Buffer.from(JSON.stringify({ version: 1 }), "utf8"));
    expect(handlers.get("clipboard.read")?.()).toEqual({ payload: null });
  });
});
