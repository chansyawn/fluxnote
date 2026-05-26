import path from "node:path";

import type { LocaleCode } from "@shared/features/preferences/settings";
import { app, Menu, nativeImage, type NativeImage, Tray } from "electron";

import { getTrayMenuLabel } from "./tray-i18n";

interface TrayManagerServices {
  activateMainWindow: () => void;
  getLocale: () => LocaleCode;
  openMainWindowDevTools: () => void;
  requestQuit: () => void;
}

// UUID v5 derived from "app.fluxnotes.tray".
const TRAY_GUID = "0b22f1d9-6bfc-52e0-8abd-739669015441";

export interface TrayManager {
  createTray: () => void;
  destroyTray: () => void;
  refreshMenu: () => void;
}

function resolveIconPath(iconName: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets/icons", iconName)
    : path.resolve(process.cwd(), "src/assets/icons", iconName);
}

function createTrayIcon(): NativeImage {
  const iconName =
    process.platform === "darwin"
      ? "tray-template.png"
      : process.platform === "win32"
        ? "icon.ico"
        : "32x32.png";
  const icon = nativeImage.createFromPath(resolveIconPath(iconName));

  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  return icon;
}

function getTrayGuid(): string | undefined {
  return process.platform === "darwin" || process.platform === "win32" ? TRAY_GUID : undefined;
}

export function createTrayManager(services: TrayManagerServices): TrayManager {
  let tray: Tray | null = null;

  function refreshMenu(): void {
    if (!tray) {
      return;
    }

    const locale = services.getLocale();
    const menuTemplate = [
      {
        click: services.activateMainWindow,
        label: getTrayMenuLabel(locale, "show"),
      },
      { type: "separator" as const },
      {
        click: services.requestQuit,
        label: getTrayMenuLabel(locale, "quit"),
      },
    ];

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      menuTemplate.splice(1, 0, {
        click: services.openMainWindowDevTools,
        label: getTrayMenuLabel(locale, "devTools"),
      });
    }

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
  }

  function createTray(): void {
    if (tray) {
      return;
    }

    const icon = createTrayIcon();
    const trayIcon = icon.isEmpty() ? nativeImage.createEmpty() : icon;
    const trayGuid = getTrayGuid();
    tray = trayGuid ? new Tray(trayIcon, trayGuid) : new Tray(trayIcon);
    tray.setToolTip("Fluxnotes");
    refreshMenu();
  }

  function destroyTray(): void {
    tray?.destroy();
    tray = null;
  }

  return {
    createTray,
    destroyTray,
    refreshMenu,
  };
}
