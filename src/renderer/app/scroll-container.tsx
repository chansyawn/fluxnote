import { createContext, useContext, type ReactNode } from "react";

const ScrollContainerContext = createContext<HTMLElement | null>(null);

export function ScrollContainerProvider({
  children,
  element,
}: {
  children: ReactNode;
  element: HTMLElement | null;
}) {
  return (
    <ScrollContainerContext.Provider value={element}>{children}</ScrollContainerContext.Provider>
  );
}

export function useScrollContainer(): HTMLElement | null {
  return useContext(ScrollContainerContext);
}
