import { handle } from "@hono/node-server/vercel";
import { app } from "../server/index";

export default handle(app);