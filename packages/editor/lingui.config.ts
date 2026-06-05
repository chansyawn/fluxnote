import { createLinguiConfig } from "../../config/i18n/lingui.ts";

export default createLinguiConfig({
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
      exclude: ["src/locales"],
    },
  ],
});
