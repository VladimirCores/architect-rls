import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username", { length: 100 }).notNull().unique(),
  password_hash: text("password_hash", { length: 255 }).notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const features = sqliteTable("features", {
  id: text("id").primaryKey(),
  code: text("code", { length: 100 }).notNull().unique(),
  name: text("name", { length: 100 }).notNull(),
  description: text("description"),
  created_at: text("created_at").notNull(),
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  feature_code: text("feature_code", { length: 100 })
    .notNull()
    .references(() => features.code),
  role: text("role", { enum: ["admin", "user"] }).notNull(),
  created_at: text("created_at").notNull(),
});

export const rls = sqliteTable("rls", {
  id: text("id").primaryKey(),
  name: text("name", { length: 100 }).notNull(),
  code: text("code", { length: 20 }).notNull().unique(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  frequency_min: real("frequency_min"),
  frequency_max: real("frequency_max"),
  description: text("description", { length: 1000 }),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const boids = sqliteTable("boids", {
  id: text("id").primaryKey(),
  name: text("name", { length: 100 }).notNull(),
  code: text("code", { length: 20 }).notNull().unique(),
  speed_min: real("speed_min"),
  speed_max: real("speed_max"),
  altitude_min: real("altitude_min"),
  altitude_max: real("altitude_max"),
  description: text("description", { length: 1000 }),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key", { length: 200 }).notNull().unique(),
  value: text("value").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const simulationSessions = sqliteTable("simulation_sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] })
    .notNull()
    .default("running"),
});
