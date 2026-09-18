import { Hono } from "hono";
import type { createDb } from "./infrastructure/db/drizzle.js";

export type AppEnv = {
  Variables: {
    db: ReturnType<typeof createDb>;
    uid: string;
  };
};

const app = new Hono<AppEnv>();

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
