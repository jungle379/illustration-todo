import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

dotenv.config({ path: ".env.local" });

const connectionString = (process.env.SUPABASE_DATABASE_URL ?? "").trim();

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be configured with the Supabase Postgres connection string",
  );
}

export const client = postgres(connectionString, {
  max: process.env.VERCEL === "1" ? 1 : 10,
  prepare: false,
});

export const db = drizzle(client, { schema });
