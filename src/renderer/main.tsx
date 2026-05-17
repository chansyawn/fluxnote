import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/index";
import { applyAppPlatformAttribute } from "./app/platform";

import "./global.css";

applyAppPlatformAttribute();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
