import * as analyticsSchema from "./schemas/analytics.js";
import * as appSchema from "./schemas/app.js";
import * as migrationsSchema from "./schemas/migrations.js";

export const schema = {
  ...appSchema,
  ...analyticsSchema,
  ...migrationsSchema,
};

export type Schema = typeof schema;
