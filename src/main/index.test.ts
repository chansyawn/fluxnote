import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const startPrimaryInstance = vi.fn();
const app = {
  getPath: vi.fn((name: string) => {
    if (name === "sessionData") {
      return "/Users/tester/Library/Application Support/Fluxnotes";
    }
    if (name === "logs") {
      return "/Users/tester/Library/Logs/Fluxnotes";
    }
    return "";
  }),
  quit: vi.fn(),
  requestSingleInstanceLock: vi.fn(() => true),
  setAsDefaultProtocolClient: vi.fn(),
  setPath: vi.fn(),
};

vi.mock("node:fs", () => ({
  default: {
    mkdirSync: vi.fn(),
  },
}));

vi.mock("node:os", () => ({
  default: {
    homedir: vi.fn(() => "/Users/tester"),
  },
}));

vi.mock("electron", () => ({
  app,
}));

vi.mock("./app/bootstrap", () => ({
  startPrimaryInstance,
}));

describe("main process entry", () => {
  beforeEach(() => {
    vi.resetModules();
    startPrimaryInstance.mockReset();
    app.quit.mockReset();
    app.getPath.mockClear();
    app.requestSingleInstanceLock.mockReset();
    app.requestSingleInstanceLock.mockReturnValue(true);
    app.setAsDefaultProtocolClient.mockReset();
    app.setPath.mockReset();
  });

  it("sets userData path to ~/.flux before acquiring single-instance lock", async () => {
    await import("./index");

    expect(app.setPath).toHaveBeenCalledWith("userData", "/Users/tester/.flux");
    expect(app.setPath).toHaveBeenCalledWith(
      "sessionData",
      "/Users/tester/Library/Application Support/Fluxnotes",
    );
    expect(app.setPath).toHaveBeenCalledWith("logs", "/Users/tester/Library/Logs/Fluxnotes");
    expect(app.setPath.mock.invocationCallOrder[0]).toBeLessThan(
      app.requestSingleInstanceLock.mock.invocationCallOrder[0]!,
    );
    expect(app.setPath.mock.invocationCallOrder[1]).toBeLessThan(
      app.requestSingleInstanceLock.mock.invocationCallOrder[0]!,
    );
    expect(app.setPath.mock.invocationCallOrder[2]).toBeLessThan(
      app.requestSingleInstanceLock.mock.invocationCallOrder[0]!,
    );
  });

  it("quits when single-instance lock is unavailable", async () => {
    app.requestSingleInstanceLock.mockReturnValue(false);

    await import("./index");

    expect(app.quit).toHaveBeenCalledTimes(1);
    expect(startPrimaryInstance).not.toHaveBeenCalled();
  });
});
