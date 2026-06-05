import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { messages } from "../locales/en/messages";
import { PlaygroundApp } from "./playground-app";

import "./playground.css";

i18n.load("en", messages);
i18n.activate("en");

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <PlaygroundApp />
    </I18nProvider>
  </StrictMode>,
);
