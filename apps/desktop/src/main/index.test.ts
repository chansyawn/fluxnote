import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  configureMacOSAppBehavior: vi.fn(),
  configureUserDataPath: vi.fn(),
  handleSquirrelStartup: vi.fn(() => Promise.resolve(false)),
  quit: vi.fn(),
  requestSingleInstanceLock: vi.fn(() => true),
  setAsDefaultProtocolClient: vi.fn(),
  startPrimaryInstance: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    quit: mocks.quit,
    requestSingleInstanceLock: mocks.requestSingleInstanceLock,
    setAsDefaultProtocolClient: mocks.setAsDefaultProtocolClient,
  },
}));

vi.mock("./app/app-paths", () => ({
  configureUserDataPath: mocks.configureUserDataPath,
}));

vi.mock("./app/bootstrap", () => ({
  startPrimaryInstance: mocks.startPrimaryInstance,
}));

vi.mock("./app/mac-os-app-behavior", () => ({
  configureMacOSAppBehavior: mocks.configureMacOSAppBehavior,
}));

vi.mock("./app/squirrel-startup", () => ({
  handleSquirrelStartup: mocks.handleSquirrelStartup,
}));

const originalDefaultApp = (process as { defaultApp?: boolean }).defaultApp;

function setDefaultApp(value: boolean | undefined): void {
  Object.defineProperty(process, "defaultApp", {
    configurable: true,
    value,
  });
}

async function importMainEntrypoint(): Promise<void> {
  await import("./index");
  await Promise.resolve();
  await Promise.resolve();
}

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setDefaultApp(false);
    mocks.handleSquirrelStartup.mockResolvedValue(false);
    mocks.requestSingleInstanceLock.mockReturnValue(true);
  });

  afterEach(() => {
    setDefaultApp(originalDefaultApp);
  });

  it("configures early macOS behavior before requesting the single instance lock", async () => {
    await importMainEntrypoint();

    expect(mocks.configureMacOSAppBehavior).toHaveBeenCalledTimes(1);
    expect(mocks.configureMacOSAppBehavior).toHaveBeenCalledBefore(mocks.requestSingleInstanceLock);
    expect(mocks.startPrimaryInstance).toHaveBeenCalledTimes(1);
    expect(mocks.quit).not.toHaveBeenCalled();
  });

  it("quits the secondary process after applying early app behavior", async () => {
    mocks.requestSingleInstanceLock.mockReturnValue(false);

    await importMainEntrypoint();

    expect(mocks.configureMacOSAppBehavior).toHaveBeenCalledBefore(mocks.requestSingleInstanceLock);
    expect(mocks.quit).toHaveBeenCalledTimes(1);
    expect(mocks.startPrimaryInstance).not.toHaveBeenCalled();
  });
});
