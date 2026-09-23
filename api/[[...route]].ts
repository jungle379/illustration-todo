import { handle } from "@hono/node-server/vercel";
import { app } from "../server/index.js";

export default handle(app);