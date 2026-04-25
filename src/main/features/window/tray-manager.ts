import path from "node:path";

import { app, Menu, nativeImage, Tray } from "electron";

interface TrayManagerServices {
  requestQuit: () => void;
  showMainWindow: () => void;
  toggleMainWindow: () => void;
}

export interface TrayManager {
  createTray: () => void;
  destroyTray: () => void;
}

function resolveTrayIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.resolve(process.cwd(), "src/assets/electron/32x32.png");
}

export function createTrayManager(services: TrayManagerServices): TrayManager {
  let tray: Tray | null = null;

  function createTray(): void {
    if (tray) {
      return;
    }

    const icon = nativeImage.createFromPath(resolveTrayIconPath());
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip("FluxNote");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          click: services.showMainWindow,
          label: "Show FluxNote",
        },
        { type: "separator" },
        {
          click: services.requestQuit,
          label: "Quit",
        },
      ]),
    );
    tray.on("click", services.toggleMainWindow);
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
