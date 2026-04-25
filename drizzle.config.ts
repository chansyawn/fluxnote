import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  out: "./src/main/features/database/drizzle",
  schema: "./src/main/features/database/database-schema.ts",
});
