import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { events, exams, metrics, sessions, simulations, trainings } from "./schemas/analytics.js";

const analyticsSchema = {
  sessions,
  events,
  simulations,
  trainings,
  exams,
  metrics,
};

export function createAnalyticsDb(dbPath: string) {
  const connection = new Database(dbPath);
  connection.exec("PRAGMA journal_mode = WAL");
  connection.exec("PRAGMA foreign_keys = ON");
  return drizzle(connection, { schema: analyticsSchema });
}

export type AnalyticsDb = ReturnType<typeof createAnalyticsDb>;
