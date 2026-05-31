import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  createFromPath: vi.fn(),
  write: vi.fn(),
  writeBuffer: vi.fn(),
}));

vi.mock("electron", () => ({
  clipboard: {
    write: mocks.write,
    writeBuffer: mocks.writeBuffer,
  },
  nativeImage: {
    createFromPath: mocks.createFromPath,
  },
}));

import { registerClipboardCommands } from "./command";

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
    mocks.write.mockReset();
    mocks.writeBuffer.mockReset();
  });

  it("writes standard formats in one clipboard operation", () => {
    const handlers = createHandlers();
    const result = handlers.get("clipboard.write")?.({
      html: "<p>Text</p>",
      text: "Text",
    });

    expect(result).toBeUndefined();
    expect(mocks.write).toHaveBeenCalledWith({
      html: "<p>Text</p>",
      text: "Text",
    });
    expect(mocks.writeBuffer).not.toHaveBeenCalled();
  });

  it("writes a native image with standard formats", () => {
    const handlers = createHandlers();
    const image = {
      isEmpty: vi.fn(() => false),
    };
    mocks.createFromPath.mockReturnValue(image);

    handlers.get("clipboard.write")?.({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      imageFileUrl: "file:///tmp/block-1/photo.png",
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.createFromPath).toHaveBeenCalledWith("/tmp/block-1/photo.png");
    expect(mocks.write).toHaveBeenCalledWith({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
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
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });

    expect(mocks.write).toHaveBeenCalledWith({
      html: '<img src="file:///tmp/block-1/photo.png" alt="Alt">',
      text: "![Alt](file:///tmp/block-1/photo.png)",
    });
    expect(mocks.writeBuffer).not.toHaveBeenCalled();
  });
});
