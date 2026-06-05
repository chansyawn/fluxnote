import { createContext, useContext, type ReactNode } from "react";

const EditorOverlayContainerContext = createContext<HTMLElement | null>(null);

interface BlockEditorOverlayContainerProviderProps {
  children: ReactNode;
  container: HTMLElement | null;
}

export function BlockEditorOverlayContainerProvider({
  children,
  container,
}: BlockEditorOverlayContainerProviderProps) {
  return (
    <EditorOverlayContainerContext.Provider value={container}>
      {children}
    </EditorOverlayContainerContext.Provider>
  );
}

export function useEditorOverlayContainer(): HTMLElement | null {
  return useContext(EditorOverlayContainerContext);
}
