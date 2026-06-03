import { screen, type BrowserWindow, type Rectangle } from "electron";

/** Last window position per display id; in-memory only, not persisted */
const positionMemory = new Map<number, { x: number; y: number }>();

function clampToWorkArea(
  x: number,
  y: number,
  width: number,
  height: number,
  workArea: Rectangle,
): { x: number; y: number } {
  return {
    x: Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width)),
    y: Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height)),
  };
}

function centerInWorkArea(
  width: number,
  height: number,
  workArea: Rectangle,
): { x: number; y: number } {
  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
  };
}

/**
 * Computes where to place the window: display under the cursor, then
 * restore remembered position (clamped) or center in work area.
 */
export function calculateWindowPosition(window: BrowserWindow): { x: number; y: number } {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const [width, height] = window.getSize();
  const { workArea } = display;

  const remembered = positionMemory.get(display.id);
  if (remembered) {
    return clampToWorkArea(remembered.x, remembered.y, width, height, workArea);
  }

  return centerInWorkArea(width, height, workArea);
}

/** Stores the current window top-left in memory for the display it is on */
export function saveWindowPosition(window: BrowserWindow): void {
  const bounds = window.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  positionMemory.set(display.id, { x: bounds.x, y: bounds.y });
}
