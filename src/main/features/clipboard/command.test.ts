import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFromPath: vi.fn(),
  readBuffer: vi.fn(),
  write: vi.fn(),
  writeBuffer: vi.fn(),
}));

vi.mock("electron", () => ({
  clipboard: {
    readBuffer: mocks.readBuffer,
    write: mocks.write,
    writeBuffer: mocks.writeBuffer,
  },
  nativeImage: {
    createFromPath: mocks.createFromPath,
  },
}));

import { BLOCK_EDITOR_CLIPBOARD_MIME } from "@shared/features/block-editor/clipboard";

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
    mocks.readBuffer.mockReset();
    mocks.write.mockReset();
    mocks.writeBuffer.mockReset();
  });

  it("writes standard formats and block editor payload buffer", () => {
    const handlers = createHandlers();
    const result = handlers.get("clipboard.write")?.({
      html: "<p>Text</p>",
      payload,
      text: "Text",
    });

    expect(result).toBeUndefined();
    expect(mocks.write).toHaveBeenCalledWith({
      html: "<p>Text</p>",
      text: "Text",
    });
    expect(mocks.writeBuffer).toHaveBeenCalledWith(
      BLOCK_EDITOR_CLIPBOARD_MIME,
      Buffer.from(JSON.stringify(payload), "utf8"),
    );
  });

  it("writes a native image when image file url is provided", () => {
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
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      image,
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
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
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
  });

  it("reads a valid block editor payload buffer", () => {
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
