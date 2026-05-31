import { $useKeymap } from "@milkdown/kit/utils";

const TAB_FOCUS_TRAP_PRIORITY = 0;

export const tabFocusTrapKeymap = $useKeymap("tabFocusTrap", {
  TrapTabFocus: {
    shortcuts: "Tab",
    priority: TAB_FOCUS_TRAP_PRIORITY,
    command: () => () => true,
  },
  TrapShiftTabFocus: {
    shortcuts: "Shift-Tab",
    priority: TAB_FOCUS_TRAP_PRIORITY,
    command: () => () => true,
  },
});
