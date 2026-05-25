import path from "node:path";

import type { EventBus } from "@main/core/ipc";
import { app, BrowserWindow, type BrowserWindowConstructorOptions } from "electron";

import { calculateWindowPosition, saveWindowPosition } from "./position";

const MAIN_WINDOW_MAX_WIDTH = 960;
const MAIN_WINDOW_MIN_WIDTH = 320;
const MAIN_WINDOW_HEIGHT = 720;
const MAIN_WINDOW_WIDTH = 540;

const MAIN_WINDOW_WORKSPACE_OPTIONS = {
  visibleOnFullScreen: true,
  skipTransformProcessType: true,
} as const;

interface WindowManagerServices {
  emitEvent: EventBus["emit"];
  onAutoArchiveTrigger: (force: boolean) => void;
  onOpenBlockReady: () => void;
}

export interface WindowManager {
  createMainWindow: () => void;
  getMainWindow: () => BrowserWindow | null;
  hideMainWindow: () => void;
  openMainWindowDevTools: () => void;
  prepareToQuit: () => void;
  requestQuit: () => void;
  restartApp: () => void;
  showMainWindow: () => void;
  toggleMainWindow: () => void;
}

function resolveIconPath(iconName: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets/icons", iconName)
    : path.resolve(process.cwd(), "src/assets/icons", iconName);
}

function getMainWindowPlatformOptions(): BrowserWindowConstructorOptions {
  if (process.platform === "darwin")
    return {
      vibrancy: "under-window",
      visualEffectState: "active",
      transparent: true,
    };

  if (process.platform === "win32")
    return {
      backgroundMaterial: "none",
      roundedCorners: true,
      thickFrame: true,
      transparent: false,
    };

  return {};
}

export function createWindowManager(services: WindowManagerServices): WindowManager {
  let mainWindow: BrowserWindow | null = null;
  let isQuitting = false;

  function keepWindowVisibleAcrossWorkspaces(window: BrowserWindow): void {
    if (process.platform !== "darwin") {
      return;
    }

    window.setVisibleOnAllWorkspaces(true, MAIN_WINDOW_WORKSPACE_OPTIONS);
  }

  function getMainWindow(): BrowserWindow | null {
    if (mainWindow?.isDestroyed()) {
      mainWindow = null;
    }

    return mainWindow;
  }

  function showMainWindow(): void {
    const currentWindow = getMainWindow();
    if (!currentWindow) {
      return;
    }

    if (process.platform === "darwin") {
      app.focus({ steal: true });
    }

    if (currentWindow.isMinimized()) {
      currentWindow.restore();
    }
    if (!currentWindow.isVisible()) {
      const { x, y } = calculateWindowPosition(currentWindow);
      currentWindow.setPosition(x, y);
      keepWindowVisibleAcrossWorkspaces(currentWindow);
      currentWindow.show();
    }
    keepWindowVisibleAcrossWorkspaces(currentWindow);
    currentWindow.focus();
  }

  function hideMainWindow(): void {
    const currentWindow = getMainWindow();
    if (!currentWindow) {
      return;
    }

    saveWindowPosition(currentWindow);
    currentWindow.hide();
  }

  function openMainWindowDevTools(): void {
    const currentWindow = getMainWindow();
    if (!currentWindow) {
      return;
    }

    currentWindow.webContents.openDevTools({ mode: "detach" });
  }

  function toggleMainWindow(): void {
    const currentWindow = getMainWindow();
    if (!currentWindow) {
      return;
    }

    if (currentWindow.isVisible()) {
      hideMainWindow();
      return;
    }

    showMainWindow();
  }

  function prepareToQuit(): void {
    isQuitting = true;
  }

  function requestQuit(): void {
    prepareToQuit();
    getMainWindow()?.destroy();
    app.quit();
  }

  function restartApp(): void {
    app.relaunch();
    requestQuit();
  }

  function createMainWindow(): void {
    const existingWindow = getMainWindow();
    if (existingWindow) {
      showMainWindow();
      return;
    }

    const createdWindow = new BrowserWindow({
      acceptFirstMouse: true,
      alwaysOnTop: true,
      backgroundColor: "#00000000",
      frame: false,
      hasShadow: true,
      icon: process.platform === "win32" ? resolveIconPath("icon.ico") : undefined,
      maximizable: false,
      maxWidth: MAIN_WINDOW_MAX_WIDTH,
      minWidth: MAIN_WINDOW_MIN_WIDTH,
      resizable: true,
      show: false,
      skipTaskbar: true,
      title: "Fluxnotes",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.cjs"),
        sandbox: true,
      },
      width: MAIN_WINDOW_WIDTH,
      height: MAIN_WINDOW_HEIGHT,
      ...getMainWindowPlatformOptions(),
    });
    mainWindow = createdWindow;

    keepWindowVisibleAcrossWorkspaces(createdWindow);

    createdWindow.on("close", (event) => {
      if (isQuitting) {
        return;
      }

      services.emitEvent("window.close-requested", null);
      event.preventDefault();
      hideMainWindow();
    });

    createdWindow.on("closed", () => {
      if (mainWindow === createdWindow) {
        mainWindow = null;
      }
    });

    createdWindow.on("focus", () => {
      services.emitEvent("window.focus-changed", true);
      services.onAutoArchiveTrigger(false);
    });

    createdWindow.on("blur", () => {
      services.emitEvent("window.focus-changed", false);
    });

    createdWindow.on("hide", () => {
      services.onAutoArchiveTrigger(true);
    });

    createdWindow.webContents.on("did-finish-load", () => {
      services.onOpenBlockReady();
    });

    createdWindow.once("ready-to-show", () => {
      if (!createdWindow.isDestroyed() && mainWindow === createdWindow) {
        const { x, y } = calculateWindowPosition(createdWindow);
        createdWindow.setPosition(x, y);
        createdWindow.show();
      }
      services.emitEvent("window.focus-changed", true);
      services.onOpenBlockReady();
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      void createdWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      createdWindow.webContents.openDevTools({ mode: "detach" });
      return;
    }

    void createdWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return {
    createMainWindow,
    getMainWindow,
    hideMainWindow,
    openMainWindowDevTools,
    prepareToQuit,
    requestQuit,
    restartApp,
    showMainWindow,
    toggleMainWindow,
  };
}
