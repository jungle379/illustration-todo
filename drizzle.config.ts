import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default {
  schema: "./server/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url:
      process.env.TURSO_DATABASE_URL ??
      process.env.STURSO_DATABASE_URL ??
      "file:local.db",
    authToken:
      process.env.TURSO_AUTH_TOKEN ?? process.env.STURSO_AUTH_TOKEN,
  },
};
