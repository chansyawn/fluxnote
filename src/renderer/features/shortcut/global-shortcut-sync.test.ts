import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
} from "@renderer/features/shortcut/global-shortcut-sync";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@renderer/clients/global-shortcut", () => ({
  isRegistered: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
}));

import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@renderer/clients/global-shortcut";

const mockedIsRegistered = vi.mocked(isRegistered);
const mockedRegister = vi.mocked(register);
const mockedUnregister = vi.mocked(unregister);

describe("global-shortcut-sync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers shortcut when currently not registered", async () => {
    mockedIsRegistered.mockResolvedValue(false);
    mockedRegister.mockResolvedValue();

    const result = await registerGlobalShortcut({
      shortcut: "Alt+N",
      onPressed: vi.fn(),
    });

    expect(result).toEqual({ type: "registered" });
    expect(mockedUnregister).not.toHaveBeenCalled();
    expect(mockedRegister).toHaveBeenCalledTimes(1);
  });

  it("unregisters before registering when shortcut already exists", async () => {
    mockedIsRegistered.mockResolvedValue(true);
    mockedUnregister.mockResolvedValue();
    mockedRegister.mockResolvedValue();

    await registerGlobalShortcut({
      shortcut: "Alt+N",
      onPressed: vi.fn(),
    });

    expect(mockedUnregister).toHaveBeenCalledWith("Alt+N");
    expect(mockedRegister).toHaveBeenCalledWith("Alt+N", expect.any(Function));
  });

  it("returns recoverable-error when registration throws but shortcut remains active", async () => {
    const registerError = new Error("register failed");
    mockedIsRegistered.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockedRegister.mockRejectedValue(registerError);

    const result = await registerGlobalShortcut({
      shortcut: "Alt+N",
      onPressed: vi.fn(),
    });

    expect(result).toEqual({ type: "recoverable-error", error: registerError });
  });

  it("returns unavailable when registration throws and shortcut is inactive", async () => {
    const registerError = new Error("register failed");
    mockedIsRegistered.mockResolvedValue(false);
    mockedRegister.mockRejectedValue(registerError);

    const result = await registerGlobalShortcut({
      shortcut: "Alt+N",
      onPressed: vi.fn(),
    });

    expect(result).toEqual({ type: "unavailable", error: registerError });
  });

  it("invokes callback only when event state is Pressed", async () => {
    const onPressed = vi.fn();
    mockedIsRegistered.mockResolvedValue(false);
    mockedRegister.mockImplementation(async (_shortcut, callback) => {
      callback({ state: "Released" } as ShortcutEvent);
      callback({ state: "Pressed" } as ShortcutEvent);
    });

    await registerGlobalShortcut({
      shortcut: "Alt+N",
      onPressed,
    });

    expect(onPressed).toHaveBeenCalledTimes(1);
  });

  it("swallows unregister errors", async () => {
    mockedUnregister.mockRejectedValue(new Error("cannot unregister"));

    await expect(unregisterGlobalShortcut("Alt+N")).resolves.toBeUndefined();
  });
});
