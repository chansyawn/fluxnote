import {
  cursorPosition,
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  type Monitor,
} from "@tauri-apps/api/window";

type WindowPosition = { x: number; y: number };

// In-memory store: monitorKey → last known window position
const windowPositions = new Map<string, WindowPosition>();

function getMonitorKey(monitor: Monitor): string {
  return `${monitor.position.x}_${monitor.position.y}_${monitor.size.width}_${monitor.size.height}`;
}

function calculateCenteredPosition(monitor: Monitor, windowSize: LogicalSize): WindowPosition {
  const scaleFactor = monitor.scaleFactor;
  // Convert monitor physical coords to logical for consistent arithmetic
  const monitorLogicalX = monitor.position.x / scaleFactor;
  const monitorLogicalY = monitor.position.y / scaleFactor;
  const monitorLogicalW = monitor.size.width / scaleFactor;
  const monitorLogicalH = monitor.size.height / scaleFactor;

  return {
    x: monitorLogicalX + (monitorLogicalW - windowSize.width) / 2,
    y: monitorLogicalY + (monitorLogicalH - windowSize.height) / 2,
  };
}

function constrainPositionToMonitor(
  pos: WindowPosition,
  monitor: Monitor,
  windowSize: LogicalSize,
): WindowPosition {
  const scaleFactor = monitor.scaleFactor;
  const minX = monitor.position.x / scaleFactor;
  const minY = monitor.position.y / scaleFactor;
  const maxX = minX + monitor.size.width / scaleFactor - windowSize.width;
  const maxY = minY + monitor.size.height / scaleFactor - windowSize.height;

  return {
    x: Math.max(minX, Math.min(pos.x, maxX)),
    y: Math.max(minY, Math.min(pos.y, maxY)),
  };
}

export async function saveCurrentWindowPosition(): Promise<void> {
  const appWindow = getCurrentWindow();
  const [position, monitor] = await Promise.all([appWindow.outerPosition(), currentMonitor()]);

  if (!monitor) return;

  const key = getMonitorKey(monitor);
  // outerPosition returns physical pixels; convert to logical using scale factor
  const scaleFactor = monitor.scaleFactor;
  windowPositions.set(key, {
    x: position.x / scaleFactor,
    y: position.y / scaleFactor,
  });
}

export async function showWindowOnCursorMonitor(): Promise<void> {
  const appWindow = getCurrentWindow();

  const [cursor, monitors] = await Promise.all([cursorPosition(), availableMonitors()]);

  // cursorPosition() and monitor.position/size are all in physical pixels — safe to compare directly
  const monitor =
    monitors.find(
      (m) =>
        cursor.x >= m.position.x &&
        cursor.x < m.position.x + m.size.width &&
        cursor.y >= m.position.y &&
        cursor.y < m.position.y + m.size.height,
    ) ?? null;

  if (!monitor) {
    await appWindow.unminimize();
    await appWindow.show();
    await appWindow.setFocus();
    return;
  }

  const key = getMonitorKey(monitor);
  const windowSize = await appWindow.outerSize();
  // Convert physical size to logical
  const scaleFactor = monitor.scaleFactor;
  const logicalSize = new LogicalSize(
    windowSize.width / scaleFactor,
    windowSize.height / scaleFactor,
  );

  const saved = windowPositions.get(key);
  const targetPos = saved
    ? constrainPositionToMonitor(saved, monitor, logicalSize)
    : calculateCenteredPosition(monitor, logicalSize);

  await appWindow.setPosition(new LogicalPosition(targetPos.x, targetPos.y));
  await appWindow.unminimize();
  await appWindow.show();
  await appWindow.setFocus();
}
