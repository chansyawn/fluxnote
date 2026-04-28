import path from "node:path";

import { app, Menu, nativeImage, type NativeImage, Tray } from "electron";

interface TrayManagerServices {
  openMainWindowDevTools: () => void;
  requestQuit: () => void;
  showMainWindow: () => void;
}

export interface TrayManager {
  createTray: () => void;
  destroyTray: () => void;
}

function resolveIconPath(iconName: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets/icons", iconName)
    : path.resolve(process.cwd(), "src/assets/icons", iconName);
}

function createTrayIcon(): NativeImage {
  const iconName = process.platform === "darwin" ? "tray-template.png" : "32x32.png";
  const icon = nativeImage.createFromPath(resolveIconPath(iconName));

  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  return icon;
}

export function createTrayManager(services: TrayManagerServices): TrayManager {
  let tray: Tray | null = null;

  function createTray(): void {
    if (tray) {
      return;
    }

    const icon = createTrayIcon();
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip("FluxNote");
    const menuTemplate = [
      {
        click: services.showMainWindow,
        label: "Show FluxNote",
      },
      { type: "separator" as const },
      {
        click: services.requestQuit,
        label: "Quit",
      },
    ];

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      menuTemplate.splice(1, 0, {
        click: services.openMainWindowDevTools,
        label: "Open DevTools",
      });
    }

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
  }

  function destroyTray(): void {
    tray?.destroy();
    tray = null;
  }

  return {
    createTray,
    destroyTray,
  };
}
