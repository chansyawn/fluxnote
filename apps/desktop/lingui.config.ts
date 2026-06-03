import { createLinguiConfig } from "../../config/i18n/lingui.ts";

export default createLinguiConfig({
  catalogs: [
    {
      path: "<rootDir>/src/renderer/locales/{locale}/messages",
      include: ["src/renderer"],
    },
  ],
});
