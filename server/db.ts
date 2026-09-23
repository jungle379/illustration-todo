import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createHash } from "node:crypto";
import * as schema from "./schema.js";

dotenv.config({ path: ".env.local" });

const url = (
  process.env.TURSO_DATABASE_URL ??
  process.env.STURSO_DATABASE_URL ??
  "file:local.db"
).trim();
const authToken = (
  process.env.TURSO_AUTH_TOKEN ?? process.env.STURSO_AUTH_TOKEN ?? ""
).trim();

if (process.env.VERCEL === "1" && (!url || url.startsWith("file:"))) {
  throw new Error(
    "TURSO_DATABASE_URL must be configured in Vercel environment variables",
  );
}

if (process.env.VERCEL === "1" && !authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN must be configured in Vercel environment variables",
  );
}

if (process.env.VERCEL === "1") {
  console.info("Turso configuration", {
    host: new URL(url).host,
    tokenPresent: Boolean(authToken),
    tokenLength: authToken.length,
    tokenFingerprint: createHash("sha256")
      .update(authToken)
      .digest("hex")
      .slice(0, 12),
  });
}

export const client = createClient({
  url,
  authToken: url.startsWith("file:") ? undefined : authToken,
});

export const db = drizzle(client, { schema });
