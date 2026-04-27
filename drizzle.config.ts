import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  out: "./src/main/core/database/drizzle",
  schema: "./src/main/core/database/database-schema.ts",
});
