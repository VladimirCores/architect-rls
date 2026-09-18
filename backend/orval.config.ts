import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../swagger/dist/openapi.json",
    },
    output: {
      mode: "tags-split",
      client: "hono",
      target: "./src/generated/endpoints",
      schemas: "./src/generated/schemas",
      override: {
        hono: {
          handlers: "./src/generated/handlers",
          validator: true,
        },
      },
    },
  },
});
