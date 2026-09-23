import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.ts";

dotenv.config({ path: ".env.local" });

const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.STURSO_DATABASE_URL ??
  "file:local.db";
const authToken =
  process.env.TURSO_AUTH_TOKEN ?? process.env.STURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken: url.startsWith("file:") ? undefined : authToken,
});

export const db = drizzle(client, { schema });
