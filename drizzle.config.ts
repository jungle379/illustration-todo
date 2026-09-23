import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default {
  schema: "./server/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL,
  },
};
