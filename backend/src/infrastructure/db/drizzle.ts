import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { schema } from "./schema.js";

export function createDb(dbPath: string) {
  const connection = new Database(dbPath);
  connection.exec("PRAGMA journal_mode = WAL");
  connection.exec("PRAGMA foreign_keys = ON");
  return drizzle(connection, { schema });
}

export type Db = ReturnType<typeof createDb>;
