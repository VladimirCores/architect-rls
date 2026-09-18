import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const migrations = sqliteTable("_migrations", {
  name: text("name").primaryKey(),
  applied_at: text("applied_at").notNull(),
  checksum: text("checksum", { length: 64 }).notNull(),
  status: text("status", { enum: ["applied", "failed"] })
    .notNull()
    .default("applied"),
});
