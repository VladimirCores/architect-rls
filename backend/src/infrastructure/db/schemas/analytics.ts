import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  simulation_id: text("simulation_id"),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] })
    .notNull()
    .default("running"),
});

export const events = sqliteTable("events", {
  event_id: integer("event_id").primary({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull(),
  type: integer("type").notNull(),
  timestamp: text("timestamp").notNull(),
  uid: text("uid").notNull(),
  idempotency_key: text("idempotency_key", { length: 36 }).notNull(),
  payload_json: text("payload_json"),
});

export const simulations = sqliteTable("simulations", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id),
  name: text("name", { length: 200 }).notNull(),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] })
    .notNull()
    .default("running"),
  params_json: text("params_json"),
});

export const trainings = sqliteTable("trainings", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id),
  name: text("name", { length: 200 }).notNull(),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] })
    .notNull()
    .default("running"),
  params_json: text("params_json"),
});

export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id),
  name: text("name", { length: 200 }).notNull(),
  started_at: text("started_at").notNull(),
  completed_at: text("completed_at"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] })
    .notNull()
    .default("running"),
  params_json: text("params_json"),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => sessions.id),
  name: text("name", { length: 200 }).notNull(),
  value: real("value").notNull(),
  timestamp: text("timestamp").notNull(),
});
