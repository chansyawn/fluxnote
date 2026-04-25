import path from "node:path";

import { app, BrowserWindow } from "electron";

import type { EmitIpcEvent } from "../ipc/emit-ipc-event";
import { calculateWindowPosition, saveWindowPosition } from "./window-position";

const MAIN_WINDOW_HEIGHT = 600;
const MAIN_WINDOW_MAX_WIDTH = 640;
const MAIN_WINDOW_MIN_WIDTH = 320;
const MAIN_WINDOW_WIDTH = 640;
const MAIN_WINDOW_VIBRANCY = "under-window" as const;

interface WindowManagerServices {
  emitEvent: EmitIpcEvent;
  onAutoArchiveTrigger: (force: boolean) => void;
  onOpenBlockReady: () => void;
}

export interface WindowManager {
  createMainWindow: () => void;
  getMainWindow: () => BrowserWindow | null;
  hideMainWindow: () => void;
  prepareToQuit: () => void;
  requestQuit: () => void;
  showMainWindow: () => void;
  toggleMainWindow: () => void;
}

export function createWindowManager(services: WindowManagerServices): WindowManager {
  let mainWindow: BrowserWindow | null = null;
  let isQuitting = false;

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

    if (currentWindow.isMinimized()) {
      currentWindow.restore();
    }
    if (!currentWindow.isVisible()) {
      const { x, y } = calculateWindowPosition(currentWindow);
      currentWindow.setPosition(x, y);
      currentWindow.show();
    }
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

  function createMainWindow(): void {
    const existingWindow = getMainWindow();
    if (existingWindow) {
      showMainWindow();
      return;
    }

    const macOSVibrancyOptions =
      process.platform === "darwin"
        ? {
            vibrancy: MAIN_WINDOW_VIBRANCY,
            visualEffectState: "active" as const,
          }
        : {};

    const createdWindow = new BrowserWindow({
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
    mainWindow = createdWindow;

    createdWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    createdWindow.on("close", (event) => {
      if (isQuitting) {
        return;
      }

      services.emitEvent("windowCloseRequested", null);
      event.preventDefault();
      hideMainWindow();
    });

    createdWindow.on("closed", () => {
      if (mainWindow === createdWindow) {
        mainWindow = null;
      }
    });

    createdWindow.on("focus", () => {
      services.emitEvent("windowFocusChanged", true);
      services.onAutoArchiveTrigger(false);
    });

    createdWindow.on("blur", () => {
      services.emitEvent("windowFocusChanged", false);
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
      services.emitEvent("windowFocusChanged", true);
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
    prepareToQuit,
    requestQuit,
    showMainWindow,
    toggleMainWindow,
  };
}
