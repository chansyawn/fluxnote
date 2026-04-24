/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  net,
  protocol,
  Tray,
} from "electron";
import ElectronStore from "electron-store";

import { AutoArchiveRuntime } from "./features/auto-archive-runtime";
import { BackendStore } from "./features/backend-store";
import { createEmitIpcEvent } from "./features/ipc/emit-ipc-event";
import { registerIpcHandlers } from "./features/ipc/register-ipc-handlers";
import { calculateWindowPosition, saveWindowPosition } from "./features/window/window-position";

const MAIN_WINDOW_HEIGHT = 600;
const MAIN_WINDOW_MAX_WIDTH = 640;
const MAIN_WINDOW_MIN_WIDTH = 320;
const MAIN_WINDOW_WIDTH = 640;
const MAIN_WINDOW_VIBRANCY = "under-window" as const;
const SETTINGS_STORE_NAME = "settings.json";
const DEEP_LINK_PROTOCOL = "fluxnote";
type StoreSnapshot = Record<string, unknown>;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "assets",
    privileges: {
      bypassCSP: true,
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let pendingDeepLinkBlockId: string | null = null;

const backendStore = new BackendStore();
const stores = new Map<string, ElectronStore<StoreSnapshot>>();
const settingsStore = getConfigStore(SETTINGS_STORE_NAME, {});
const emitIpcEvent = createEmitIpcEvent({
  getMainWindow: () => mainWindow,
});
const autoArchiveRuntime = new AutoArchiveRuntime({
  emitEvent: emitIpcEvent,
  getWindowVisible: () => Boolean(mainWindow?.isVisible()),
  settingsFilePath: settingsStore.path,
  store: backendStore,
});

function toStoreSnapshot(value: unknown): StoreSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as StoreSnapshot;
}

function normalizeStoreConfig(name: string): { fileExtension: string; name: string } {
  const normalizedName = path.basename(name.trim() || "settings.json");
  const dotIndex = normalizedName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= normalizedName.length - 1) {
    return {
      fileExtension: "json",
      name: normalizedName,
    };
  }

  return {
    fileExtension: normalizedName.slice(dotIndex + 1),
    name: normalizedName.slice(0, dotIndex),
  };
}

function getConfigStore(name: string, defaults: unknown): ElectronStore<StoreSnapshot> {
  const cacheKey = path.basename(name.trim() || "settings.json");
  const existingStore = stores.get(cacheKey);
  if (existingStore) {
    return existingStore;
  }

  const { fileExtension, name: storeName } = normalizeStoreConfig(cacheKey);
  const store = new ElectronStore<StoreSnapshot>({
    clearInvalidConfig: false,
    cwd: app.getPath("userData"),
    defaults: toStoreSnapshot(defaults) ?? {},
    fileExtension,
    name: storeName,
  });
  stores.set(cacheKey, store);
  return store;
}

function parseBlockIdFromDeepLink(urlText: string): string | null {
  try {
    const parsed = new URL(urlText);
    if (parsed.protocol !== `${DEEP_LINK_PROTOCOL}:`) {
      return null;
    }

    const blockPath = parsed.pathname.replace(/^\/+/, "");
    if (parsed.hostname !== "block" || !blockPath) {
      return null;
    }

    return blockPath;
  } catch {
    return null;
  }
}

function extractDeepLinkFromArgv(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`)) ?? null;
}

function emitPendingDeepLink() {
  if (!pendingDeepLinkBlockId) {
    return;
  }

  emitIpcEvent("deepLinkOpenBlock", { blockId: pendingDeepLinkBlockId });
  pendingDeepLinkBlockId = null;
}

function handleDeepLink(urlText: string) {
  const blockId = parseBlockIdFromDeepLink(urlText);
  if (!blockId) {
    return;
  }

  pendingDeepLinkBlockId = blockId;
  showMainWindow();
  emitPendingDeepLink();
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (!mainWindow.isVisible()) {
    const { x, y } = calculateWindowPosition(mainWindow);
    mainWindow.setPosition(x, y);
    mainWindow.show();
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function toggleMainWindowVisibility() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible()) {
    saveWindowPosition(mainWindow);
    mainWindow.hide();
    return;
  }

  showMainWindow();
}

function resolveTrayIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.resolve(process.cwd(), "src/assets/electron/32x32.png");
}

function createTray() {
  const iconPath = resolveTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("FluxNote");

  const menu = Menu.buildFromTemplate([
    {
      click: () => {
        showMainWindow();
      },
      label: "Show FluxNote",
    },
    { type: "separator" },
    {
      click: () => {
        app.quit();
      },
      label: "Quit",
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    toggleMainWindowVisibility();
  });
}

function createMainWindow() {
  const macOSVibrancyOptions =
    process.platform === "darwin"
      ? {
          vibrancy: MAIN_WINDOW_VIBRANCY,
          visualEffectState: "active" as const,
        }
      : {};

  mainWindow = new BrowserWindow({
    acceptFirstMouse: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    frame: false,
    hasShadow: true,
    height: MAIN_WINDOW_HEIGHT,
    maximizable: false,
    maxWidth: MAIN_WINDOW_MAX_WIDTH,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    resizable: true,
    show: false,
    skipTaskbar: true,
    title: "fluxnote",
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
    width: MAIN_WINDOW_WIDTH,
    ...macOSVibrancyOptions,
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    emitIpcEvent("windowCloseRequested", null);
    event.preventDefault();
    if (mainWindow) {
      saveWindowPosition(mainWindow);
      mainWindow.hide();
    }
  });

  mainWindow.on("focus", () => {
    emitIpcEvent("windowFocusChanged", true);
    void autoArchiveRuntime.trigger(false);
  });

  mainWindow.on("blur", () => {
    emitIpcEvent("windowFocusChanged", false);
  });

  mainWindow.on("hide", () => {
    void autoArchiveRuntime.trigger(true);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    emitPendingDeepLink();
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      const { x, y } = calculateWindowPosition(mainWindow);
      mainWindow.setPosition(x, y);
      mainWindow.show();
    }
    emitIpcEvent("windowFocusChanged", true);
    emitPendingDeepLink();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

function registerAssetProtocol() {
  protocol.handle("assets", async (request) => {
    try {
      const requestUrl = new URL(request.url);
      const blockId = decodeURIComponent(requestUrl.hostname);
      const rawPath = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ""));
      if (!blockId || !rawPath) {
        return new Response("Invalid asset url", { status: 400 });
      }

      const normalizedPath = path.normalize(rawPath);
      if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        return new Response("Invalid asset path", { status: 400 });
      }

      const blockDir = path.resolve(backendStore.getAssetPathForBlock(blockId));
      const assetPath = path.resolve(path.join(blockDir, normalizedPath));
      if (!assetPath.startsWith(`${blockDir}${path.sep}`) && assetPath !== blockDir) {
        return new Response("Invalid asset path", { status: 400 });
      }

      await fs.stat(assetPath);
      return await net.fetch(pathToFileURL(assetPath).toString());
    } catch (error) {
      return new Response("Asset not found", {
        status: (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500,
      });
    }
  });
}

function readPreferencesSnapshot(): Record<string, unknown> {
  return getConfigStore(SETTINGS_STORE_NAME, {}).store as Record<string, unknown>;
}

function writePreferencesSnapshot(value: Record<string, unknown>): void {
  getConfigStore(SETTINGS_STORE_NAME, {}).store = value;
}

function registerAppIpcHandlers() {
  registerIpcHandlers({
    emitEvent: emitIpcEvent,
    getMainWindow() {
      return mainWindow;
    },
    readPreferences: readPreferencesSnapshot,
    requestQuit() {
      isQuitting = true;
      mainWindow?.destroy();
      app.quit();
    },
    store: backendStore,
    toggleMainWindow: toggleMainWindowVisibility,
    writePreferences: writePreferencesSnapshot,
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    showMainWindow();
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) {
      handleDeepLink(deepLink);
    }
  });
}

app.on("open-url", (event, urlText) => {
  event.preventDefault();
  handleDeepLink(urlText);
});

void app.whenReady().then(async () => {
  app.dock?.hide();
  await backendStore.init();
  app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
  registerAssetProtocol();
  registerAppIpcHandlers();
  createMainWindow();
  createTray();
  await autoArchiveRuntime.start();

  const startupDeepLink = extractDeepLinkFromArgv(process.argv);
  if (startupDeepLink) {
    handleDeepLink(startupDeepLink);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      return;
    }

    showMainWindow();
  });
});

app.on("before-quit", async () => {
  isQuitting = true;
  autoArchiveRuntime.stop();
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
  await backendStore.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
