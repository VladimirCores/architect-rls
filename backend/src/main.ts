import { Hono } from "hono";
import type { createDb } from "./infrastructure/db/drizzle.js";
import { createDb as openDb } from "./infrastructure/db/drizzle.js";
import adminApp from "./generated/endpoints/admin/admin.js";
import authApp from "./generated/endpoints/auth/auth.js";
import boidsApp from "./generated/endpoints/boids/boids.js";
import eventsApp from "./generated/endpoints/events/events.js";
import logsApp from "./generated/endpoints/logs/logs.js";
import mapApp from "./generated/endpoints/map/map.js";
import markingApp from "./generated/endpoints/marking/marking.js";
import profileApp from "./generated/endpoints/profile/profile.js";
import reportsApp from "./generated/endpoints/reports/reports.js";
import rlsApp from "./generated/endpoints/rls/rls.js";
import settingsApp from "./generated/endpoints/settings/settings.js";
import simulationApp from "./generated/endpoints/simulation/simulation.js";

export type AppEnv = {
  Variables: {
    db: ReturnType<typeof createDb>;
    uid: string;
  };
};

const app = new Hono<AppEnv>();

const db = openDb(process.env.DB_PATH ?? "./data/app.db");

app.use(async (c, next) => {
  c.set("db", db);
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Generated routes (from OpenAPI via orval) — mounted per tag
app.route("/api/v1", authApp);
app.route("/api/v1", profileApp);
app.route("/api/v1", simulationApp);
app.route("/api/v1", markingApp);
app.route("/api/v1", mapApp);
app.route("/api/v1", rlsApp);
app.route("/api/v1", boidsApp);
app.route("/api/v1", settingsApp);
app.route("/api/v1", reportsApp);
app.route("/api/v1", logsApp);
app.route("/api/v1", adminApp);
app.route("/api/v1", eventsApp);

export default app;
