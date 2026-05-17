import { Outlet } from "@tanstack/react-router";

import { WindowTitleBar } from "./window-title-bar";

export function AppShell() {
  return (
    <div className="app-window-shell mx-auto flex h-full w-full flex-col overflow-hidden">
      <WindowTitleBar />
      <main
        tabIndex={1}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
