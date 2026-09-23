import { handle } from "@hono/node-server/vercel";
import { app } from "../server/index.ts";

export default handle(app);