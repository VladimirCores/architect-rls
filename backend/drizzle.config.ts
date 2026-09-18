import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schemas/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH ?? "./data/app.db",
  },
  migrations: {
    table: "_migrations",
  },
});
