import { eq } from "drizzle-orm";
import type { LoginContext } from "../generated/endpoints/auth/auth.context.js";
import type { AppEnv } from "../main.js";
import { features as featuresTable, users } from "../infrastructure/db/schemas/app.js";

/**
 * POST /login — authenticate and start a session.
 *
 * Business logic lives here (controllers), not in the generated routes/zod.
 * Validation of the body is already done by the generated handler's zValidator.
 */
export async function login(c: LoginContext<AppEnv>) {
  const db = c.get("db");
  const { username, password } = c.req.valid("json");

  const user = await db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !(await Bun.password.verify(password, user.password_hash))) {
    return c.json(
      {
        type: "https://docs.example.com/problems/invalid-credentials",
        title: "Invalid credentials",
        status: 401,
        detail: "Incorrect username or password",
      },
      401,
    );
  }

  if (user.disabled) {
    return c.json(
      {
        type: "https://docs.example.com/problems/account-disabled",
        title: "Account disabled",
        status: 403,
        detail: "This account has been disabled",
      },
      403,
    );
  }

  const features = await db
    .select({ code: featuresTable.code })
    .from(featuresTable)
    .all();

  return c.json(
    {
      uid: user.id,
      username: user.username,
      role: user.role,
      features: features.map((f) => f.code),
    },
    200,
  );
}